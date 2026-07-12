from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.presentation_outline_model import (
    PresentationImageStyle,
    PresentationOutlineModel,
    SlideOutlineModel,
)
from models.selected_generation import IndexedSlideMarkdownInput
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.partial_deck_service import (
    build_outline_hashes,
    build_partial_deck_metadata,
    canonical_hash,
    generate_selected_slides,
    get_generated_slide_indices,
)
from services.presentation_preview_service import (
    ensure_presentation_preview_manifest,
    get_presentation_preview_manifest,
)
from utils.llm_failure import status_error_from_exception


async def prepare_derived_regeneration(
    sql_session: AsyncSession,
    *,
    source_id: uuid.UUID,
    request_id: uuid.UUID,
    slide_indices: list[int],
    outline_overrides: Optional[list[IndexedSlideMarkdownInput]] = None,
    image_style_override: Optional[PresentationImageStyle] = None,
) -> tuple[AsyncPresentationGenerationTaskModel, bool]:
    if source_id == request_id:
        raise HTTPException(status_code=409, detail="request_id collides with source")

    overrides = outline_overrides or []
    request_fingerprint = canonical_hash(
        {
            "source_id": str(source_id),
            "slide_indices": slide_indices,
            "outline_overrides": [item.model_dump(mode="json") for item in overrides],
            "image_style_override": (
                image_style_override.model_dump(mode="json")
                if image_style_override
                else None
            ),
        }
    )
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
            and stored_data.get("request_fingerprint") == request_fingerprint
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

    presentation_data = source.model_dump(exclude={"id", "created_at", "updated_at"})
    derived = PresentationModel(**deepcopy(presentation_data), id=request_id)
    _apply_outline_overrides(derived, overrides, image_style_override)
    derived_slides = [
        SlideModel(
            **deepcopy(slide.model_dump(exclude={"id", "presentation"})),
            id=uuid.uuid4(),
            presentation=request_id,
        )
        for slide in source_slides
    ]
    inherited_indices = await get_generated_slide_indices(
        sql_session,
        source_id,
        source_slides,
    )
    outline = derived.get_presentation_outline()
    status = AsyncPresentationGenerationTaskModel(
        id=request_id,
        presentation_id=request_id,
        status="pending",
        message="Preparing selected slide regeneration...",
        data={
            "presentation_id": str(request_id),
            "source_presentation_id": str(source_id),
            "slide_indices": slide_indices,
            "generated_slide_indices": inherited_indices,
            "request_fingerprint": request_fingerprint,
            "prompt_revision": None,
            "outline_hashes": build_outline_hashes(outline) if outline else [],
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
    status = await sql_session.get(AsyncPresentationGenerationTaskModel, presentation_id)
    presentation = await sql_session.get(PresentationModel, presentation_id)
    if not status or not presentation:
        raise HTTPException(status_code=404, detail="Derived presentation not found")

    try:
        status.status = "processing"
        status.message = "Regenerating selected slides..."
        status.updated_at = datetime.now()
        sql_session.add(status)
        await sql_session.commit()

        generation = await generate_selected_slides(
            sql_session,
            presentation=presentation,
            slide_indices=slide_indices,
            auth_token=auth_token,
            api_key=api_key,
        )
        inherited = status.data.get("generated_slide_indices", []) if status.data else []
        generated_indices = sorted(set(inherited) | set(slide_indices))
        pending_indices, deck_state = build_partial_deck_metadata(
            slide_count=presentation.n_slides,
            generated_indices=generated_indices,
        )

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
            **(status.data or {}),
            "presentation_id": str(presentation_id),
            "path": None,
            "edit_path": edit_path,
            "source_presentation_id": str(source_id),
            "slide_indices": slide_indices,
            "generated_slide_indices": generated_indices,
            "pending_slide_indices": pending_indices,
            "deck_state": deck_state,
            "prompt_revision": generation["prompt_revision"],
            "outline_hashes": generation["outline_hashes"],
            "preview_manifest": preview_manifest.model_dump(mode="json"),
            "warnings": warnings,
        }
        sql_session.add(status)
        await sql_session.commit()
    except Exception as exc:
        status.status = "error"
        status.message = "Selected slide regeneration failed"
        status.updated_at = datetime.now()
        status.error = status_error_from_exception(exc)
        sql_session.add(status)
        await sql_session.commit()
        raise


def _apply_outline_overrides(
    presentation: PresentationModel,
    overrides: list[IndexedSlideMarkdownInput],
    image_style_override: Optional[PresentationImageStyle] = None,
) -> None:
    if not overrides and image_style_override is None:
        return
    outline = presentation.get_presentation_outline()
    if not outline:
        raise HTTPException(status_code=400, detail="Presentation outlines not found")
    for override in overrides:
        if override.index >= len(outline.slides):
            raise HTTPException(
                status_code=422,
                detail="outline_overrides must be within the source presentation",
            )
        outline.slides[override.index] = SlideOutlineModel(
            **override.model_dump(exclude={"index"})
        )
    presentation.outlines = PresentationOutlineModel(
        slides=outline.slides,
        image_style=image_style_override or outline.image_style,
    ).model_dump(mode="json")
