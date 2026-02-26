import json
import re
import uuid
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from models.llm_message import LLMSystemMessage, LLMUserMessage
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.database import get_async_session
from services.image_generation_service import ImageGenerationService
from services.llm_client import LLMClient
from utils.asset_directory_utils import get_images_directory
from utils.llm_calls.edit_slide import get_edited_slide_content
from utils.llm_calls.edit_slide_html import get_edited_slide_html
from utils.llm_calls.select_slide_type_on_edit import get_slide_layout_from_prompt
from utils.llm_client_error_handler import handle_llm_client_exceptions
from utils.llm_provider import get_model
from utils.process_slides import process_old_and_new_slides_and_fetch_assets


SLIDE_ROUTER = APIRouter(prefix="/slide", tags=["Slide"])


PATH_TOKEN_REGEX = re.compile(r"([^[.\]]+)|\[(\d+)\]")


class LayoutReflowRequest(BaseModel):
    slide_id: uuid.UUID = Field(description="Slide ID to reflow text for")
    paths: list[str] = Field(
        default_factory=list,
        description="Data paths in slide.content to compress",
    )
    max_words: int = Field(
        default=18, ge=6, le=40, description="Hard word budget for each field"
    )


class LayoutReflowUpdate(BaseModel):
    path: str
    text: str


class LayoutReflowResponse(BaseModel):
    slide_id: uuid.UUID
    updates: list[LayoutReflowUpdate]


def get_value_by_path(data: Any, path: str) -> Any:
    current = data
    for key_token, index_token in PATH_TOKEN_REGEX.findall(path):
        token: str | int
        if key_token:
            token = key_token
        elif index_token:
            token = int(index_token)
        else:
            continue

        if isinstance(token, int):
            if not isinstance(current, list) or token >= len(current):
                return None
            current = current[token]
        else:
            if not isinstance(current, dict) or token not in current:
                return None
            current = current[token]
    return current


def clamp_words(text: str, max_words: int) -> str:
    tokens = text.split()
    if len(tokens) <= max_words:
        return text.strip()
    return " ".join(tokens[:max_words]).strip()


def build_reflow_messages(
    language: str,
    fields: list[dict[str, str]],
    max_words: int,
) -> list[LLMSystemMessage | LLMUserMessage]:
    system_prompt = (
        "You rewrite slide text to fit strict layout constraints. "
        "Keep meaning, hierarchy, and business tone. "
        "Do not add new facts. "
        "Each output value must be concise and stay under the provided max_words."
    )
    user_prompt = (
        f"Language: {language}\n"
        f"Max words per field: {max_words}\n\n"
        "Return JSON with same keys only.\n"
        "Fields:\n"
        f"{json.dumps(fields, ensure_ascii=False)}"
    )
    return [
        LLMSystemMessage(content=system_prompt),
        LLMUserMessage(content=user_prompt),
    ]


def build_reflow_schema(
    fields: list[dict[str, str]], max_words: int
) -> dict[str, Any]:
    max_chars = max(40, max_words * 20)
    properties: dict[str, Any] = {}
    required: list[str] = []
    for field in fields:
        key = field["key"]
        properties[key] = {
            "type": "string",
            "minLength": 1,
            "maxLength": max_chars,
            "description": f"Compressed text for {field['path']}",
        }
        required.append(key)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


@SLIDE_ROUTER.post("/layout-reflow", response_model=LayoutReflowResponse)
async def layout_reflow(
    payload: LayoutReflowRequest,
    sql_session: AsyncSession = Depends(get_async_session),
):
    if not payload.paths:
        raise HTTPException(status_code=400, detail="paths can not be empty")

    slide = await sql_session.get(SlideModel, payload.slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    presentation = await sql_session.get(PresentationModel, slide.presentation)
    language = presentation.language if presentation and presentation.language else "English"

    unique_paths = []
    seen = set()
    for path in payload.paths:
        normalized_path = path.strip()
        if not normalized_path or normalized_path in seen:
            continue
        seen.add(normalized_path)
        unique_paths.append(normalized_path)

    fields: list[dict[str, str]] = []
    for index, path_value in enumerate(unique_paths):
        text_value = get_value_by_path(slide.content, path_value)
        if isinstance(text_value, str) and text_value.strip():
            fields.append(
                {
                    "key": f"field_{index}",
                    "path": path_value,
                    "text": text_value.strip(),
                }
            )

    if not fields:
        return LayoutReflowResponse(slide_id=slide.id, updates=[])

    response_schema = build_reflow_schema(fields, payload.max_words)
    messages = build_reflow_messages(language, fields, payload.max_words)
    model = get_model()
    client = LLMClient()

    try:
        llm_response = await client.generate_structured(
            model=model,
            messages=messages,
            response_format=response_schema,
            strict=False,
        )
    except Exception as e:
        raise handle_llm_client_exceptions(e)

    updates: list[LayoutReflowUpdate] = []
    for field in fields:
        key = field["key"]
        original_text = field["text"]
        candidate = llm_response.get(key) if isinstance(llm_response, dict) else None
        normalized = (
            candidate.strip()
            if isinstance(candidate, str) and candidate.strip()
            else original_text
        )
        normalized = clamp_words(normalized, payload.max_words)
        updates.append(LayoutReflowUpdate(path=field["path"], text=normalized))

    return LayoutReflowResponse(
        slide_id=slide.id,
        updates=updates,
    )


@SLIDE_ROUTER.post("/edit")
async def edit_slide(
    id: Annotated[uuid.UUID, Body()],
    prompt: Annotated[str, Body()],
    sql_session: AsyncSession = Depends(get_async_session),
):
    slide = await sql_session.get(SlideModel, id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    presentation = await sql_session.get(PresentationModel, slide.presentation)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    presentation_layout = presentation.get_layout()
    slide_layout = await get_slide_layout_from_prompt(
        prompt, presentation_layout, slide
    )

    edited_slide_content = await get_edited_slide_content(
        prompt, slide, presentation.language, slide_layout
    )

    image_generation_service = ImageGenerationService(get_images_directory())

    # This will mutate edited_slide_content
    new_assets = await process_old_and_new_slides_and_fetch_assets(
        image_generation_service,
        slide.content,
        edited_slide_content,
    )

    # Always assign a new unique id to the slide
    slide.id = uuid.uuid4()

    sql_session.add(slide)
    slide.content = edited_slide_content
    slide.layout = slide_layout.id
    slide.speaker_note = edited_slide_content.get("__speaker_note__", "")
    sql_session.add_all(new_assets)
    await sql_session.commit()

    return slide


@SLIDE_ROUTER.post("/edit-html", response_model=SlideModel)
async def edit_slide_html(
    id: Annotated[uuid.UUID, Body()],
    prompt: Annotated[str, Body()],
    html: Annotated[Optional[str], Body()] = None,
    sql_session: AsyncSession = Depends(get_async_session),
):
    slide = await sql_session.get(SlideModel, id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    html_to_edit = html or slide.html_content
    if not html_to_edit:
        raise HTTPException(status_code=400, detail="No HTML to edit")

    edited_slide_html = await get_edited_slide_html(prompt, html_to_edit)

    # Always assign a new unique id to the slide
    # This is to ensure that the nextjs can track slide updates
    slide.id = uuid.uuid4()

    sql_session.add(slide)
    slide.html_content = edited_slide_html
    await sql_session.commit()

    return slide
