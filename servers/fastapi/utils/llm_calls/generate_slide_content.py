import asyncio
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import HTTPException
from models.llm_message import LLMSystemMessage, LLMUserMessage
from models.presentation_layout import SlideLayoutModel
from models.presentation_outline_model import SlideOutlineModel
from services.llm_client import LLMClient
from utils.llm_client_error_handler import handle_llm_client_exceptions
from utils.llm_provider import get_model
from utils.dict_utils import get_dict_at_path, get_dict_paths_with_key, set_dict_at_path
from utils.schema_utils import add_field_in_schema, remove_fields_from_schema
from utils.custom_logger import setup_logger

logger = setup_logger(__name__)


def get_system_prompt(
    tone: Optional[str] = None,
    verbosity: Optional[str] = None,
    instructions: Optional[str] = None,
    user_image_guidance: Optional[str] = None,
):
    return f"""
        Generate structured slide based on provided outline, follow mentioned steps and notes and provide structured output.

        {"# User Instructions:" if instructions else ""}
        {instructions or ""}

        {"# Tone:" if tone else ""}
        {tone or ""}

        {"# Verbosity:" if verbosity else ""}
        {verbosity or ""}

        # Steps
        1. Analyze the outline.
        2. Generate structured slide based on the outline.
        3. Generate speaker note that is simple, clear, concise and to the point.

        # Notes
        - Slide body should not use words like "This slide", "This presentation".
        - Rephrase the slide body to make it flow naturally.
        - Only use markdown to highlight important points.
        - Make sure to follow language guidelines.
        - Speaker note should be normal text, not markdown.
        - Strictly follow the max and min character limit for every property in the slide.
        - Never ever go over the max character limit. Limit your narration to make sure you never go over the max character limit.
        - Number of items should not be more than max number of items specified in slide schema. If you have to put multiple points then merge them to obey max numebr of items.
        - Generate content as per the given tone.
        - Be very careful with number of words to generate for given field. As generating more than max characters will overflow in the design. So, analyze early and never generate more characters than allowed.
        - Do not add emoji in the content.
        - Metrics should be in abbreviated form with least possible characters. Do not add long sequence of words for metrics.
        - For verbosity:
            - If verbosity is 'concise', then generate description as 1/3 or lower of the max character limit. Don't worry if you miss content or context.
            - If verbosity is 'standard', then generate description as 2/3 of the max character limit.
            - If verbosity is 'text-heavy', then generate description as 3/4 or higher of the max character limit. Make sure it does not exceed the max character limit.
        {"# User-Provided Image Guidance:" if user_image_guidance else ""}
        {user_image_guidance or ""}
        {"- Treat user-provided image guidance as primary intent for all __image_prompt__ fields on this slide." if user_image_guidance else ""}
        {"- If the schema has ARRAY items containing images, split the guidance into N separate prompts and assign one per array element in order." if user_image_guidance else ""}
        {"- If guidance is shorter than required N prompts, infer missing prompts while preserving the same style/topic." if user_image_guidance else ""}

        User instructions, tone and verbosity should always be followed and should supercede any other instruction, except for max and min character limit, slide schema and number of items.

        - Provide output in json format and **don't include <parameters> tags**.

        # Image and Icon Output Format
        image: {{
            __image_prompt__: string,
        }}
        icon: {{
            __icon_query__: string,
        }}

    """


def get_user_prompt(
    outline: str,
    language: str,
    user_image_guidance: Optional[str] = None,
):
    return f"""
        ## Current Date and Time
        {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

        ## Icon Query And Image Prompt Language
        English

        ## Slide Content Language
        {language}

        ## Slide Outline
        {outline}

        {"## User Image Guidance" if user_image_guidance else ""}
        {user_image_guidance or ""}
    """


def get_messages(
    outline: str,
    language: str,
    tone: Optional[str] = None,
    verbosity: Optional[str] = None,
    instructions: Optional[str] = None,
    user_image_guidance: Optional[str] = None,
):

    return [
        LLMSystemMessage(
            content=get_system_prompt(
                tone,
                verbosity,
                instructions,
                user_image_guidance,
            ),
        ),
        LLMUserMessage(
            content=get_user_prompt(outline, language, user_image_guidance),
        ),
    ]


def inject_reference_image_source(
    slide_content: dict,
    reference_image_source: Optional[str],
) -> dict:
    if not reference_image_source or not isinstance(slide_content, dict):
        return slide_content

    image_paths = get_dict_paths_with_key(slide_content, "__image_prompt__")
    for image_path in image_paths:
        image_dict = get_dict_at_path(slide_content, image_path)
        if not isinstance(image_dict, dict):
            continue
        image_dict["__reference_image_source__"] = reference_image_source
        set_dict_at_path(slide_content, image_path, image_dict)

    return slide_content


def inject_slide_style_metadata(
    slide_content: dict,
    style: Optional[Dict[str, Any]],
) -> dict:
    if not style or not isinstance(slide_content, dict):
        return slide_content

    slide_content["__style__"] = style
    return slide_content


async def get_slide_content_from_type_and_outline(
    slide_layout: SlideLayoutModel,
    outline: SlideOutlineModel,
    language: str,
    tone: Optional[str] = None,
    verbosity: Optional[str] = None,
    instructions: Optional[str] = None,
):
    client = LLMClient()
    model = get_model()
    
    response_schema = remove_fields_from_schema(
        slide_layout.json_schema, ["__image_url__", "__icon_url__"]
    )
    response_schema = add_field_in_schema(
        response_schema,
        {
            "__speaker_note__": {
                "type": "string",
                "minLength": 100,
                "maxLength": 250,
                "description": "Speaker note for the slide",
            }
        },
        True,
    )

    retries = 2
    for attempt in range(retries + 1):
        try:
            logger.debug(f"Calling LLM for slide content (Model: {model}, Attempt: {attempt + 1}/{retries + 1})")
            # 60 second timeout for slide generation
            response = await asyncio.wait_for(
                client.generate_structured(
                    model=model,
                    messages=get_messages(
                        outline.content,
                        language,
                        tone,
                        verbosity,
                        instructions,
                        outline.image_prompt,
                    ),
                    response_format=response_schema,
                    strict=False,
                ),
                timeout=60.0
            )
            logger.debug("LLM response received successfully")
            response = inject_slide_style_metadata(
                response,
                outline.style,
            )
            return inject_reference_image_source(
                response,
                outline.reference_image_source,
            )

        except asyncio.TimeoutError:
            logger.warning(f"LLM call timed out after 60 seconds (Attempt {attempt + 1}/{retries + 1})")
            if attempt == retries:
                logger.error("All retry attempts failed due to timeout")
                raise HTTPException(
                    status_code=504,
                    detail="Slide generation timed out. The LLM took too long to respond.",
                )
        except Exception as e:
            logger.warning(f"Error in slide generation (Attempt {attempt + 1}/{retries + 1}): {e}")
            if attempt == retries:
                logger.error(f"All retry attempts failed: {e}")
                raise handle_llm_client_exceptions(e)
            
        # Optional: wait a bit before retrying
        if attempt < retries:
            await asyncio.sleep(1)
