import asyncio
from dataclasses import dataclass, field
from datetime import datetime
import json
import math
import os
import random
import traceback
from urllib.parse import quote_plus
from typing import Annotated, List, Literal, Optional, Tuple
import dirtyjson
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Path, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from constants.presentation import DEFAULT_TEMPLATES
from models.api_error_model import APIErrorModel
from models.presentation_and_path import PresentationPathAndEditPath
from models.presentation_from_template import EditPresentationRequest
from models.presentation_outline_model import (
    PresentationOutlineModel,
    SlideOutlineModel,
)
from enums.tone import Tone
from enums.verbosity import Verbosity
from models.pptx_models import PptxPresentationModel
from models.presentation_layout import PresentationLayoutModel
from models.presentation_structure_model import PresentationStructureModel
from models.presentation_with_slides import (
    PresentationWithSlides,
)
from models.sql.template import TemplateModel

from utils.get_layout_by_name import get_layout_by_name
from services.image_generation_service import ImageGenerationService
from utils.dict_utils import deep_update
from utils.export_utils import export_presentation
from utils.llm_calls.generate_presentation_outlines import generate_ppt_outline
from models.sql.slide import SlideModel
from models.sse_response import SSECompleteResponse, SSEErrorResponse, SSEResponse

from services.database import async_session_maker, get_async_session
from services.temp_file_service import TEMP_FILE_SERVICE
from models.sql.presentation import PresentationModel
from services.pptx_presentation_creator import PptxPresentationCreator
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from utils.asset_directory_utils import get_exports_directory, get_images_directory
from utils.llm_calls.generate_presentation_structure import (
    generate_presentation_structure,
)
from utils.llm_calls.generate_slide_content import (
    get_slide_content_from_type_and_outline,
)
from utils.ppt_utils import (
    get_presentation_title_from_outlines,
    select_toc_or_list_slide_layout_index,
)
from utils.process_slides import (
    process_slide_add_placeholder_assets,
    process_slide_and_fetch_assets,
)
import uuid
from services.presentation_service import PresentationService


from utils.custom_logger import setup_logger

logger = setup_logger(__name__)

PRESENTATION_ROUTER = APIRouter(prefix="/presentation", tags=["Presentation"])


@dataclass
class PresentationStreamSession:
    presentation_id: uuid.UUID
    subscribers: set[asyncio.Queue[tuple[int, str]]] = field(default_factory=set)
    buffer: list[tuple[int, str]] = field(default_factory=list)
    next_event_id: int = 0
    done: bool = False
    worker_task: Optional[asyncio.Task] = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def publish(self, event: str):
        self.next_event_id += 1
        event_id = self.next_event_id
        payload = (event_id, event)

        self.buffer.append(payload)
        # Keep a bounded replay buffer.
        if len(self.buffer) > 1000:
            self.buffer = self.buffer[-1000:]

        dead_subscribers = []
        for queue in self.subscribers:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                dead_subscribers.append(queue)

        for queue in dead_subscribers:
            self.subscribers.discard(queue)


STREAM_SESSIONS: dict[uuid.UUID, PresentationStreamSession] = {}
STREAM_SESSIONS_LOCK = asyncio.Lock()


async def get_or_create_stream_session(
    presentation_id: uuid.UUID,
) -> PresentationStreamSession:
    async with STREAM_SESSIONS_LOCK:
        session = STREAM_SESSIONS.get(presentation_id)
        if session is None:
            session = PresentationStreamSession(presentation_id=presentation_id)
            STREAM_SESSIONS[presentation_id] = session
        return session


async def run_stream_generation_worker(
    stream_session: PresentationStreamSession,
):
    id = stream_session.presentation_id
    try:
        async with async_session_maker() as sql_session:
            presentation = await sql_session.get(PresentationModel, id)
            if not presentation:
                stream_session.publish(
                    SSEErrorResponse(detail="Presentation not found").to_string()
                )
                return
            if not presentation.structure:
                stream_session.publish(
                    SSEErrorResponse(
                        detail="Presentation not prepared for stream",
                    ).to_string()
                )
                return
            if not presentation.outlines:
                stream_session.publish(
                    SSEErrorResponse(detail="Outlines can not be empty").to_string()
                )
                return

            image_generation_service = ImageGenerationService(get_images_directory())

            structure = presentation.get_structure()
            layout = presentation.get_layout()
            outline = presentation.get_presentation_outline()

            async_assets_generation_tasks = []
            slides: List[SlideModel] = []

            logger.info(
                f"Starting slide generation loop for {len(structure.slides)} slides"
            )
            stream_session.publish(
                SSEResponse(
                    event="response",
                    data=json.dumps({"type": "chunk", "chunk": '{ "slides": [ '}),
                ).to_string()
            )

            for i, slide_layout_index in enumerate(structure.slides):
                slide_layout = layout.slides[slide_layout_index]

                existing_slide = await sql_session.scalar(
                    select(SlideModel).where(
                        SlideModel.presentation == id, SlideModel.index == i
                    )
                )

                if existing_slide:
                    if str(existing_slide.layout) != str(slide_layout.id):
                        logger.info(
                            f"Slide {i+1} layout mismatch (DB: {existing_slide.layout}, Expected: {slide_layout.id}). Regenerating."
                        )
                        await sql_session.delete(existing_slide)
                        await sql_session.commit()
                        existing_slide = None
                    else:
                        logger.info(f"Found existing slide {i+1} (Resume)")
                        slide = existing_slide
                        slides.append(slide)

                        has_placeholders = "placeholder" in str(slide.content)
                        if has_placeholders:
                            logger.debug(
                                f"Queueing asset generation for existing slide {i+1} (Placeholders found)"
                            )
                            async_assets_generation_tasks.append(
                                process_slide_and_fetch_assets(
                                    image_generation_service, slide
                                )
                            )

                        stream_session.publish(
                            SSEResponse(
                                event="response",
                                data=json.dumps(
                                    {"type": "chunk", "chunk": slide.model_dump_json()}
                                ),
                            ).to_string()
                        )
                        continue

                logger.debug(f"Generating slide {i+1} (Layout: {slide_layout.name})")

                try:
                    slide_generation_task = asyncio.create_task(
                        get_slide_content_from_type_and_outline(
                            slide_layout,
                            outline.slides[i],
                            presentation.language,
                            presentation.tone,
                            presentation.verbosity,
                            presentation.instructions,
                        )
                    )

                    while True:
                        try:
                            slide_content = await asyncio.wait_for(
                                asyncio.shield(slide_generation_task),
                                timeout=10.0,
                            )
                            break
                        except asyncio.TimeoutError:
                            stream_session.publish(
                                SSEResponse(
                                    event="ping",
                                    data=json.dumps(
                                        {
                                            "type": "ping",
                                            "slide": i + 1,
                                            "status": "generating",
                                        }
                                    ),
                                ).to_string()
                            )
                except HTTPException as e:
                    logger.error(f"Error generating slide {i+1}: {e.detail}")
                    stream_session.publish(SSEErrorResponse(detail=e.detail).to_string())
                    return

                slide = SlideModel(
                    presentation=id,
                    layout_group=layout.name,
                    layout=slide_layout.id,
                    index=i,
                    speaker_note=slide_content.get("__speaker_note__", ""),
                    content=slide_content,
                )
                slides.append(slide)

                process_slide_add_placeholder_assets(slide)

                sql_session.add(slide)
                await sql_session.commit()
                await sql_session.refresh(slide)

                async_assets_generation_tasks.append(
                    process_slide_and_fetch_assets(image_generation_service, slide)
                )

                logger.debug(f"Yielding slide {i+1}")
                stream_session.publish(
                    SSEResponse(
                        event="response",
                        data=json.dumps(
                            {"type": "chunk", "chunk": slide.model_dump_json()}
                        ),
                    ).to_string()
                )

            stream_session.publish(
                SSEResponse(
                    event="response",
                    data=json.dumps({"type": "chunk", "chunk": " ] }"}),
                ).to_string()
            )

            logger.info(f"Waiting for {len(async_assets_generation_tasks)} asset tasks")
            generated_assets_lists = await asyncio.gather(*async_assets_generation_tasks)
            generated_assets = []
            for assets_list in generated_assets_lists:
                generated_assets.extend(assets_list)
            logger.info("Asset generation finished")

            for slide in slides:
                slide.content = dict(slide.content)

            valid_slide_ids = [s.id for s in slides]
            await sql_session.execute(
                delete(SlideModel).where(
                    SlideModel.presentation == id,
                    SlideModel.id.notin_(valid_slide_ids),
                )
            )
            await sql_session.commit()

            sql_session.add(presentation)
            sql_session.add_all(slides)
            sql_session.add_all(generated_assets)
            await sql_session.commit()

            response = PresentationWithSlides(
                **presentation.model_dump(),
                slides=slides,
            )

            logger.info("Stream complete")
            stream_session.publish(
                SSECompleteResponse(
                    key="presentation",
                    value=response.model_dump(mode="json"),
                ).to_string()
            )
    except Exception:
        logger.exception(f"Unexpected error in stream worker for presentation {id}")
        stream_session.publish(
            SSEErrorResponse(detail="Unexpected error during slide generation").to_string()
        )
    finally:
        stream_session.done = True


def _extract_auth_context(http_request: Request) -> Tuple[Optional[str], Optional[str]]:
    authorization_header = http_request.headers.get("Authorization")
    auth_token = None
    if authorization_header and authorization_header.lower().startswith("bearer "):
        auth_token = authorization_header.split(" ", 1)[1].strip()

    if not auth_token:
        auth_token = (
            http_request.cookies.get("auth_token")
            or http_request.query_params.get("token")
        )

    api_key = (
        http_request.headers.get("X-API-Key")
        or http_request.query_params.get("api_key")
    )
    return auth_token, api_key


def _build_edit_path(presentation_id: uuid.UUID, template_font: Optional[str]) -> str:
    base_path = f"/presentation?id={presentation_id}"
    if not template_font:
        return base_path
    return f"{base_path}&font={quote_plus(template_font)}"


@PRESENTATION_ROUTER.get("/all", response_model=List[PresentationWithSlides])
async def get_all_presentations(sql_session: AsyncSession = Depends(get_async_session)):
    presentations_with_slides = []

    query = (
        select(PresentationModel, SlideModel)
        .outerjoin(
            SlideModel,
            (SlideModel.presentation == PresentationModel.id) & (SlideModel.index == 0),
        )
        .order_by(PresentationModel.created_at.desc())
    )

    results = await sql_session.execute(query)
    rows = results.all()
    presentations_with_slides = [
        PresentationWithSlides(
            **presentation.model_dump(),
            slides=[first_slide] if first_slide else [],
        )
        for presentation, first_slide in rows
    ]
    return presentations_with_slides


@PRESENTATION_ROUTER.get("/{id}", response_model=PresentationWithSlides)
async def get_presentation(
    id: uuid.UUID, sql_session: AsyncSession = Depends(get_async_session)
):
    presentation = await sql_session.get(PresentationModel, id)
    if not presentation:
        raise HTTPException(404, "Presentation not found")
    slides = await sql_session.scalars(
        select(SlideModel)
        .where(SlideModel.presentation == id)
        .order_by(SlideModel.index)
    )
    return PresentationWithSlides(
        **presentation.model_dump(),
        slides=slides,
    )


@PRESENTATION_ROUTER.delete("/{id}", status_code=204)
async def delete_presentation(
    id: uuid.UUID, sql_session: AsyncSession = Depends(get_async_session)
):
    presentation = await sql_session.get(PresentationModel, id)
    if not presentation:
        raise HTTPException(404, "Presentation not found")

    await sql_session.delete(presentation)
    await sql_session.commit()
    logger.info(f"Deleted presentation: {id}")


@PRESENTATION_ROUTER.post("/create", response_model=PresentationModel)
async def create_presentation(
    content: Annotated[str, Body()],
    n_slides: Annotated[int, Body()],
    language: Annotated[str, Body()],
    file_paths: Annotated[Optional[List[str]], Body()] = None,
    tone: Annotated[Tone, Body()] = Tone.DEFAULT,
    verbosity: Annotated[Verbosity, Body()] = Verbosity.STANDARD,
    instructions: Annotated[Optional[str], Body()] = None,
    include_table_of_contents: Annotated[bool, Body()] = False,
    include_title_slide: Annotated[bool, Body()] = True,
    web_search: Annotated[bool, Body()] = False,
    font: Annotated[Optional[str], Body()] = None,
    sql_session: AsyncSession = Depends(get_async_session),
):

    if include_table_of_contents and n_slides < 3:
        raise HTTPException(
            status_code=400,
            detail="Number of slides cannot be less than 3 if table of contents is included",
        )

    return await PresentationService.create_presentation(
        sql_session,
        content,
        n_slides,
        language,
        file_paths,
        tone,
        verbosity,
        instructions,
        include_table_of_contents,
        include_title_slide,
        web_search,
        font,
    )


@PRESENTATION_ROUTER.post("/prepare", response_model=PresentationModel)
async def prepare_presentation(
    presentation_id: Annotated[uuid.UUID, Body()],
    outlines: Annotated[List[SlideOutlineModel], Body()],
    layout: Annotated[PresentationLayoutModel, Body()],
    title: Annotated[Optional[str], Body()] = None,
    sql_session: AsyncSession = Depends(get_async_session),
):
    if not outlines:
        raise HTTPException(status_code=400, detail="Outlines are required")

    return await PresentationService.prepare_structure(
        sql_session, presentation_id, layout, outlines, title
    )


@PRESENTATION_ROUTER.get("/stream/{id}", response_model=PresentationWithSlides)
async def stream_presentation(
    id: uuid.UUID,
    http_request: Request,
    sql_session: AsyncSession = Depends(get_async_session),
):
    logger.info(f"Stream requested for presentation: {id}")
    presentation = await sql_session.get(PresentationModel, id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    stream_session = await get_or_create_stream_session(id)

    async with stream_session.lock:
        if not stream_session.done and (
            stream_session.worker_task is None or stream_session.worker_task.done()
        ):
            stream_session.worker_task = asyncio.create_task(
                run_stream_generation_worker(stream_session)
            )

    subscriber_queue: asyncio.Queue[tuple[int, str]] = asyncio.Queue(maxsize=256)
    stream_session.subscribers.add(subscriber_queue)
    replay_events = list(stream_session.buffer)

    async def inner():
        try:
            last_replayed_event_id = replay_events[-1][0] if replay_events else 0

            for _, event in replay_events:
                yield event

            while True:
                if await http_request.is_disconnected():
                    break

                if stream_session.done and subscriber_queue.empty():
                    break

                try:
                    event_id, event = await asyncio.wait_for(
                        subscriber_queue.get(), timeout=15.0
                    )
                    if event_id <= last_replayed_event_id:
                        continue
                    last_replayed_event_id = event_id
                    yield event
                except asyncio.TimeoutError:
                    # Keep client-side EventSource alive while waiting for new events.
                    yield SSEResponse(
                        event="ping",
                        data=json.dumps({"type": "ping", "status": "alive"}),
                    ).to_string()
        finally:
            stream_session.subscribers.discard(subscriber_queue)
            if stream_session.done and not stream_session.subscribers:
                async with STREAM_SESSIONS_LOCK:
                    current = STREAM_SESSIONS.get(id)
                    if current is stream_session:
                        STREAM_SESSIONS.pop(id, None)

    return StreamingResponse(
        inner(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@PRESENTATION_ROUTER.patch("/update", response_model=PresentationWithSlides)
async def update_presentation(
    id: Annotated[uuid.UUID, Body()],
    n_slides: Annotated[Optional[int], Body()] = None,
    title: Annotated[Optional[str], Body()] = None,
    slides: Annotated[Optional[List[SlideModel]], Body()] = None,
    sql_session: AsyncSession = Depends(get_async_session),
):
    presentation = await sql_session.get(PresentationModel, id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    presentation_update_dict = {}
    if n_slides:
        presentation_update_dict["n_slides"] = n_slides
    if title:
        presentation_update_dict["title"] = title

    if n_slides or title:
        presentation.sqlmodel_update(presentation_update_dict)

    if slides:
        # Just to make sure id is UUID
        for slide in slides:
            slide.presentation = uuid.UUID(slide.presentation)
            slide.id = uuid.UUID(slide.id)

        await sql_session.execute(
            delete(SlideModel).where(SlideModel.presentation == presentation.id)
        )
        sql_session.add_all(slides)

    await sql_session.commit()

    return PresentationWithSlides(
        **presentation.model_dump(),
        slides=slides or [],
    )


@PRESENTATION_ROUTER.post("/export/pptx", response_model=str)
async def export_presentation_as_pptx(
    pptx_model: Annotated[PptxPresentationModel, Body()],
):
    temp_dir = TEMP_FILE_SERVICE.create_temp_dir()

    pptx_creator = PptxPresentationCreator(pptx_model, temp_dir)
    await pptx_creator.create_ppt()

    export_directory = get_exports_directory()
    pptx_path = os.path.join(
        export_directory, f"{pptx_model.name or uuid.uuid4()}.pptx"
    )
    pptx_creator.save(pptx_path)

    return pptx_path


@PRESENTATION_ROUTER.post("/export", response_model=PresentationPathAndEditPath)
async def export_presentation_as_pptx_or_pdf(
    id: Annotated[uuid.UUID, Body(description="Presentation ID to export")],
    http_request: Request,
    export_as: Annotated[
        Literal["pptx", "pdf"], Body(description="Format to export the presentation as")
    ] = "pptx",
    sql_session: AsyncSession = Depends(get_async_session),
):
    presentation = await sql_session.get(PresentationModel, id)

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    auth_token, api_key = _extract_auth_context(http_request)
    presentation_and_path = await export_presentation(
        id,
        presentation.title or str(uuid.uuid4()),
        export_as,
        auth_token=auth_token,
        api_key=api_key,
        template_font=presentation.template_font,
    )

    return PresentationPathAndEditPath(
        **presentation_and_path.model_dump(),
        edit_path=_build_edit_path(id, presentation.template_font),
    )


@PRESENTATION_ROUTER.get(
    "/status/{id}", response_model=AsyncPresentationGenerationTaskModel
)
async def check_async_presentation_generation_status(
    id: str = Path(description="ID of the presentation generation task"),
    sql_session: AsyncSession = Depends(get_async_session),
):
    status = await sql_session.get(AsyncPresentationGenerationTaskModel, id)
    if not status:
        raise HTTPException(
            status_code=404, detail="No presentation generation task found"
        )
    return status


@PRESENTATION_ROUTER.post("/edit", response_model=PresentationPathAndEditPath)
async def edit_presentation_with_new_content(
    data: Annotated[EditPresentationRequest, Body()],
    http_request: Request,
    sql_session: AsyncSession = Depends(get_async_session),
):
    presentation = await sql_session.get(PresentationModel, data.presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    slides = await sql_session.scalars(
        select(SlideModel).where(SlideModel.presentation == data.presentation_id)
    )

    new_slides = []
    slides_to_delete = []
    for each_slide in slides:
        updated_content = None
        new_slide_data = list(
            filter(lambda x: x.index == each_slide.index, data.slides)
        )
        if new_slide_data:
            updated_content = deep_update(each_slide.content, new_slide_data[0].content)
            new_slides.append(
                each_slide.get_new_slide(presentation.id, updated_content)
            )
            slides_to_delete.append(each_slide.id)

    await sql_session.execute(
        delete(SlideModel).where(SlideModel.id.in_(slides_to_delete))
    )

    sql_session.add_all(new_slides)
    await sql_session.commit()

    auth_token, api_key = _extract_auth_context(http_request)
    presentation_and_path = await export_presentation(
        presentation.id,
        presentation.title or str(uuid.uuid4()),
        data.export_as,
        auth_token=auth_token,
        api_key=api_key,
        template_font=presentation.template_font,
    )

    return PresentationPathAndEditPath(
        **presentation_and_path.model_dump(),
        edit_path=_build_edit_path(presentation.id, presentation.template_font),
    )


@PRESENTATION_ROUTER.post("/derive", response_model=PresentationPathAndEditPath)
async def derive_presentation_from_existing_one(
    data: Annotated[EditPresentationRequest, Body()],
    http_request: Request,
    sql_session: AsyncSession = Depends(get_async_session),
):
    presentation = await sql_session.get(PresentationModel, data.presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    slides = await sql_session.scalars(
        select(SlideModel).where(SlideModel.presentation == data.presentation_id)
    )

    new_presentation = presentation.get_new_presentation()
    new_slides = []
    for each_slide in slides:
        updated_content = None
        new_slide_data = list(
            filter(lambda x: x.index == each_slide.index, data.slides)
        )
        if new_slide_data:
            updated_content = deep_update(each_slide.content, new_slide_data[0].content)
        new_slides.append(
            each_slide.get_new_slide(new_presentation.id, updated_content)
        )

    sql_session.add(new_presentation)
    sql_session.add_all(new_slides)
    await sql_session.commit()

    auth_token, api_key = _extract_auth_context(http_request)
    presentation_and_path = await export_presentation(
        new_presentation.id,
        new_presentation.title or str(uuid.uuid4()),
        data.export_as,
        auth_token=auth_token,
        api_key=api_key,
        template_font=new_presentation.template_font,
    )

    return PresentationPathAndEditPath(
        **presentation_and_path.model_dump(),
        edit_path=_build_edit_path(new_presentation.id, new_presentation.template_font),
    )
