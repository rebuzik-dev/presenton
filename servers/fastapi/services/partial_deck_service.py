from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any, Optional
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.presentation_outline_model import PresentationOutlineModel
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.image_generation_service import ImageGenerationService
from services.template_prompt_profile_service import template_prompt_profile_service
from utils.asset_directory_utils import get_images_directory
from utils.get_layout_by_name import get_layout_by_name
from utils.process_slides import (
    process_slide_add_placeholder_assets,
    process_slide_and_fetch_assets,
)
from utils.template_prompt_overrides import (
    build_prompt_profile_revision,
    get_active_template_prompt,
    merge_generation_instructions,
)


NOT_GENERATED_STATE = "not_generated"
GENERATED_STATE = "generated"


def canonical_hash(value: Any) -> str:
    serialized = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def build_outline_hashes(outline: PresentationOutlineModel) -> list[str]:
    return [
        canonical_hash(slide.model_dump(mode="json"))
        for slide in outline.slides
    ]


async def get_generated_slide_indices(
    sql_session: AsyncSession,
    presentation_id: uuid.UUID,
    slides: list[SlideModel],
) -> list[int]:
    status = await sql_session.get(
        AsyncPresentationGenerationTaskModel,
        presentation_id,
    )
    stored = status.data.get("generated_slide_indices") if status and status.data else None
    if isinstance(stored, list) and all(isinstance(item, int) for item in stored):
        return sorted(set(stored))

    # Legacy decks did not persist partial metadata and are fully generated.
    return sorted(
        slide.index
        for slide in slides
        if not (
            isinstance(slide.properties, dict)
            and slide.properties.get("generationState") == NOT_GENERATED_STATE
        )
    )


def build_partial_deck_metadata(
    *,
    slide_count: int,
    generated_indices: list[int],
) -> tuple[list[int], str]:
    generated = sorted(set(generated_indices))
    pending = [index for index in range(slide_count) if index not in generated]
    return pending, "complete" if not pending else "partial"


async def generate_selected_slides(
    sql_session: AsyncSession,
    *,
    presentation: PresentationModel,
    slide_indices: list[int],
    auth_token: Optional[str],
    api_key: Optional[str],
) -> dict[str, Any]:
    stored_layout = presentation.get_layout()
    prompt_profile = await template_prompt_profile_service.get_by_slug(
        stored_layout.name
    )
    prompt_revision = build_prompt_profile_revision(prompt_profile)
    latest_layout = await get_layout_by_name(
        stored_layout.name,
        auth_token=auth_token,
        api_key=api_key,
        prompt_profile=prompt_profile,
    )
    outline = presentation.get_presentation_outline()
    if not outline:
        raise HTTPException(status_code=400, detail="Presentation outlines not found")

    slides_result = await sql_session.scalars(
        select(SlideModel)
        .where(SlideModel.presentation == presentation.id)
        .order_by(SlideModel.index)
    )
    slides = list(slides_result)
    slides_by_index = {slide.index: slide for slide in slides}
    instructions = merge_generation_instructions(
        presentation.instructions,
        get_active_template_prompt(prompt_profile),
    )

    selected: list[tuple[SlideModel, SlideLayoutModel]] = []
    tasks = []
    for index in slide_indices:
        slide = slides_by_index.get(index)
        if not slide or index >= len(outline.slides):
            raise HTTPException(
                status_code=422,
                detail=f"Slide {index} is missing from the deck or outlines",
            )
        slide_layout = find_preserved_layout(latest_layout, slide.layout)
        selected.append((slide, slide_layout))
        tasks.append(
            _generate_slide_content(
                slide_layout,
                outline.slides[index],
                presentation.language,
                presentation.tone,
                presentation.verbosity,
                instructions,
            )
        )

    generated_contents = await asyncio.gather(*tasks)
    image_service = ImageGenerationService(get_images_directory())
    asset_tasks = []
    outline_hashes = build_outline_hashes(outline)
    for (slide, slide_layout), content in zip(selected, generated_contents):
        slide.layout_group = latest_layout.name
        slide.layout = slide_layout.id
        slide.content = content
        slide.speaker_note = content.get("__speaker_note__", "")
        slide.properties = {
            "generationState": GENERATED_STATE,
            "outlineHash": outline_hashes[slide.index],
        }
        slide.html_content = None
        process_slide_add_placeholder_assets(slide)
        asset_tasks.append(process_slide_and_fetch_assets(image_service, slide))

    generated_assets_lists = await asyncio.gather(*asset_tasks)
    sql_session.add_all([slide for slide, _layout in selected])
    sql_session.add_all(
        asset for assets in generated_assets_lists for asset in assets
    )
    await sql_session.commit()
    return {
        "prompt_revision": prompt_revision,
        "outline_hashes": outline_hashes,
    }


async def _generate_slide_content(*args: Any, **kwargs: Any) -> dict[str, Any]:
    # Keep llmai imports out of API/model collection so validation and database
    # tests remain usable even when an optional provider SDK is unavailable.
    from utils.llm_calls.generate_slide_content import (
        get_slide_content_from_type_and_outline,
    )

    return await get_slide_content_from_type_and_outline(*args, **kwargs)


def find_preserved_layout(
    latest_layout: PresentationLayoutModel,
    source_layout_id: str,
) -> SlideLayoutModel:
    exact = next(
        (slide for slide in latest_layout.slides if slide.id == source_layout_id),
        None,
    )
    if exact:
        return exact

    normalized_id = source_layout_id.split(":", 1)[-1]
    candidates = [
        slide
        for slide in latest_layout.slides
        if slide.id.split(":", 1)[-1] == normalized_id
    ]
    if len(candidates) == 1:
        return candidates[0]
    raise HTTPException(
        status_code=409,
        detail=f"Layout '{source_layout_id}' is no longer available",
    )
