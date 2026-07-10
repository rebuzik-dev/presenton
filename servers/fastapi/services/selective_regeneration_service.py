from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.image_generation_service import ImageGenerationService
from services.presentation_preview_service import (
    ensure_presentation_preview_manifest,
    get_presentation_preview_manifest,
)
from services.template_prompt_profile_service import template_prompt_profile_service
from utils.asset_directory_utils import get_images_directory
from utils.get_layout_by_name import get_layout_by_name
from utils.llm_calls.generate_slide_content import (
    get_slide_content_from_type_and_outline,
)
from utils.process_slides import (
    process_slide_add_placeholder_assets,
    process_slide_and_fetch_assets,
)
from utils.template_prompt_overrides import (
    build_prompt_profile_revision,
    get_active_template_prompt,
    merge_generation_instructions,
)


async def prepare_derived_regeneration(
    sql_session: AsyncSession,
    *,
    source_id: uuid.UUID,
    request_id: uuid.UUID,
    slide_indices: list[int],
) -> tuple[AsyncPresentationGenerationTaskModel, bool]:
    if source_id == request_id:
        raise HTTPException(status_code=409, detail="request_id collides with source")

    existing_presentation = await sql_session.get(PresentationModel, request_id)
    existing_status = await sql_session.get(
        AsyncPresentationGenerationTaskModel,
        request_id,
    )
    if existing_presentation or existing_status:
        stored_data = existing_status.data if existing_status else None
        if (
            existing_presentation
            and existing_status
            and stored_data
            and stored_data.get("source_presentation_id") == str(source_id)
            and stored_data.get("slide_indices") == slide_indices
        ):
            return existing_status, False
        raise HTTPException(status_code=409, detail="request_id is already in use")

    source = await sql_session.get(PresentationModel, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source presentation not found")
    source_slides_result = await sql_session.scalars(
        select(SlideModel)
        .where(SlideModel.presentation == source_id)
        .order_by(SlideModel.index)
    )
    source_slides = list(source_slides_result)
    slide_by_index = {slide.index: slide for slide in source_slides}
    if any(index not in slide_by_index for index in slide_indices):
        raise HTTPException(
            status_code=422,
            detail="slide_indices must be within the source presentation",
        )

    presentation_data = source.model_dump(
        exclude={"id", "created_at", "updated_at"}
    )
    derived = PresentationModel(
        **deepcopy(presentation_data),
        id=request_id,
    )
    derived_slides = [
        SlideModel(
            **deepcopy(
                slide.model_dump(exclude={"id", "presentation"})
            ),
            id=uuid.uuid4(),
            presentation=request_id,
        )
        for slide in source_slides
    ]
    status = AsyncPresentationGenerationTaskModel(
        id=request_id,
        presentation_id=request_id,
        status="pending",
        message="Preparing selected slide regeneration...",
        data={
            "presentation_id": str(request_id),
            "source_presentation_id": str(source_id),
            "slide_indices": slide_indices,
            "prompt_revision": None,
            "preview_manifest": None,
            "warnings": [],
        },
    )
    sql_session.add(derived)
    sql_session.add_all(derived_slides)
    sql_session.add(status)
    await sql_session.commit()
    return status, True


async def run_derived_regeneration(
    sql_session: AsyncSession,
    *,
    presentation_id: uuid.UUID,
    source_id: uuid.UUID,
    slide_indices: list[int],
    auth_token: Optional[str],
    api_key: Optional[str],
    preview_auth_context: dict[str, dict[str, str]],
) -> None:
    status = await sql_session.get(
        AsyncPresentationGenerationTaskModel,
        presentation_id,
    )
    presentation = await sql_session.get(PresentationModel, presentation_id)
    if not status or not presentation:
        raise HTTPException(status_code=404, detail="Derived presentation not found")

    try:
        status.status = "processing"
        status.message = "Regenerating selected slides..."
        status.updated_at = datetime.now()
        sql_session.add(status)
        await sql_session.commit()

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
            .where(SlideModel.presentation == presentation_id)
            .order_by(SlideModel.index)
        )
        slides = list(slides_result)
        slides_by_index = {slide.index: slide for slide in slides}
        generation_instructions = merge_generation_instructions(
            presentation.instructions,
            get_active_template_prompt(prompt_profile),
        )

        selected = []
        content_tasks = []
        for index in slide_indices:
            slide = slides_by_index.get(index)
            if not slide or index >= len(outline.slides):
                raise HTTPException(
                    status_code=422,
                    detail=f"Slide {index} is missing from the derived deck or outlines",
                )
            slide_layout = _find_preserved_layout(latest_layout, slide.layout)
            selected.append((slide, slide_layout))
            content_tasks.append(
                get_slide_content_from_type_and_outline(
                    slide_layout,
                    outline.slides[index],
                    presentation.language,
                    presentation.tone,
                    presentation.verbosity,
                    generation_instructions,
                )
            )

        generated_contents = await asyncio.gather(*content_tasks)
        image_service = ImageGenerationService(get_images_directory())
        asset_tasks = []
        for (slide, _slide_layout), content in zip(selected, generated_contents):
            slide.content = content
            slide.speaker_note = content.get("__speaker_note__", "")
            slide.properties = None
            slide.html_content = None
            process_slide_add_placeholder_assets(slide)
            asset_tasks.append(process_slide_and_fetch_assets(image_service, slide))

        generated_assets_lists = await asyncio.gather(*asset_tasks)
        generated_assets = [
            asset
            for assets in generated_assets_lists
            for asset in assets
        ]
        sql_session.add_all([slide for slide, _layout in selected])
        sql_session.add_all(generated_assets)
        await sql_session.commit()

        warnings: list[str] = []
        try:
            preview_manifest = await ensure_presentation_preview_manifest(
                sql_session,
                presentation_id,
                auth_context=preview_auth_context,
            )
        except HTTPException as exc:
            warnings.append(str(exc.detail))
            preview_manifest = await get_presentation_preview_manifest(
                sql_session,
                presentation_id,
            )

        edit_path = (
            f"/presentation?id={presentation_id}&font={quote_plus(presentation.template_font)}"
            if presentation.template_font
            else f"/presentation?id={presentation_id}"
        )
        status.status = "completed"
        status.message = "Selected slides regenerated"
        status.updated_at = datetime.now()
        status.error = None
        status.data = {
            "presentation_id": str(presentation_id),
            "path": None,
            "edit_path": edit_path,
            "source_presentation_id": str(source_id),
            "slide_indices": slide_indices,
            "prompt_revision": prompt_revision,
            "preview_manifest": preview_manifest.model_dump(mode="json"),
            "warnings": warnings,
        }
        sql_session.add(status)
        await sql_session.commit()
    except Exception as exc:
        status.status = "error"
        status.message = "Selected slide regeneration failed"
        status.updated_at = datetime.now()
        status.error = {"detail": str(getattr(exc, "detail", exc))}
        sql_session.add(status)
        await sql_session.commit()
        raise


def _find_preserved_layout(
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
