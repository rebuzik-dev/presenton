from __future__ import annotations

from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.presentation_outline_model import PresentationOutlineModel, SlideOutlineModel
from models.selected_generation import GenerateSelectedSlidesRequest
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.partial_deck_service import (
    NOT_GENERATED_STATE,
    build_outline_hashes,
    build_partial_deck_metadata,
    canonical_hash,
    generate_selected_slides,
)
from services.presentation_preview_service import (
    ensure_presentation_preview_manifest,
    get_presentation_preview_manifest,
)
from services.template_prompt_profile_service import template_prompt_profile_service
from utils.get_layout_by_name import get_layout_by_name
from utils.ppt_utils import get_presentation_title_from_outlines
from utils.template_prompt_overrides import get_active_template_prompt


async def prepare_selected_generation(
    sql_session: AsyncSession,
    *,
    request: GenerateSelectedSlidesRequest,
) -> tuple[AsyncPresentationGenerationTaskModel, bool]:
    request_fingerprint = canonical_hash(request.model_dump(mode="json"))
    existing_presentation = await sql_session.get(PresentationModel, request.request_id)
    existing_status = await sql_session.get(
        AsyncPresentationGenerationTaskModel,
        request.request_id,
    )
    if existing_presentation or existing_status:
        stored_fingerprint = (
            existing_status.data.get("request_fingerprint")
            if existing_status and existing_status.data
            else None
        )
        if existing_presentation and existing_status and stored_fingerprint == request_fingerprint:
            return existing_status, False
        raise HTTPException(status_code=409, detail="request_id is already in use")

    outline = _request_outline(request)
    presentation = PresentationModel(
        id=request.request_id,
        content="\n\n".join(slide.content for slide in request.slides_markdown),
        n_slides=len(request.slides_markdown),
        language=request.language,
        title=get_presentation_title_from_outlines(outline),
        outlines=outline.model_dump(mode="json"),
        instructions=request.instructions,
        tone=request.tone.value,
        verbosity=request.verbosity.value,
        include_table_of_contents=False,
        include_title_slide=True,
        web_search=False,
        template_font=request.font.strip() if request.font else None,
    )
    status = AsyncPresentationGenerationTaskModel(
        id=request.request_id,
        presentation_id=request.request_id,
        status="pending",
        message="Preparing partial presentation shell...",
        data={
            "presentation_id": str(request.request_id),
            "request_fingerprint": request_fingerprint,
            "slide_indices": request.slide_indices,
            "generated_slide_indices": [],
            "pending_slide_indices": list(range(len(request.slides_markdown))),
            "deck_state": "partial",
            "prompt_revision": None,
            "outline_hashes": build_outline_hashes(outline),
            "preview_manifest": None,
            "warnings": [],
        },
    )
    sql_session.add(presentation)
    sql_session.add(status)
    await sql_session.commit()
    return status, True


async def run_selected_generation(
    sql_session: AsyncSession,
    *,
    request: GenerateSelectedSlidesRequest,
    auth_token: Optional[str],
    api_key: Optional[str],
    preview_auth_context: dict[str, dict[str, str]],
) -> None:
    presentation = await sql_session.get(PresentationModel, request.request_id)
    status = await sql_session.get(
        AsyncPresentationGenerationTaskModel,
        request.request_id,
    )
    if not presentation or not status:
        raise HTTPException(status_code=404, detail="Presentation generation not found")

    try:
        status.status = "processing"
        status.message = "Preparing layouts..."
        status.updated_at = datetime.now()
        sql_session.add(status)
        await sql_session.commit()

        prompt_profile = await template_prompt_profile_service.get_by_slug(request.template)
        layout = await get_layout_by_name(
            request.template,
            ordered=request.ordered,
            auth_token=auth_token,
            api_key=api_key,
            prompt_profile=prompt_profile,
        )
        outline = _request_outline(request)
        await _prepare_structure(
            sql_session,
            presentation.id,
            layout,
            outlines=outline.slides,
            title=presentation.title,
            using_slides_markdown=True,
            template_prompt=get_active_template_prompt(prompt_profile),
        )
        await sql_session.refresh(presentation)
        structure = presentation.get_structure()
        if not structure or len(structure.slides) != presentation.n_slides:
            raise HTTPException(status_code=500, detail="Failed to prepare full deck shell")

        outline_hashes = build_outline_hashes(outline)
        placeholder_slides = [
            SlideModel(
                presentation=presentation.id,
                layout_group=layout.name,
                layout=layout.slides[layout_index].id,
                index=index,
                content={"placeholder": "Слайд ещё не сгенерирован"},
                properties={
                    "generationState": NOT_GENERATED_STATE,
                    "outlineHash": outline_hashes[index],
                },
            )
            for index, layout_index in enumerate(structure.slides)
        ]
        sql_session.add_all(placeholder_slides)
        await sql_session.commit()

        status.message = "Generating selected slides..."
        sql_session.add(status)
        await sql_session.commit()
        generation = await generate_selected_slides(
            sql_session,
            presentation=presentation,
            slide_indices=request.slide_indices,
            auth_token=auth_token,
            api_key=api_key,
        )
        pending_indices, deck_state = build_partial_deck_metadata(
            slide_count=presentation.n_slides,
            generated_indices=request.slide_indices,
        )

        warnings: list[str] = []
        try:
            preview_manifest = await ensure_presentation_preview_manifest(
                sql_session,
                presentation.id,
                auth_context=preview_auth_context,
            )
        except HTTPException as exc:
            warnings.append(str(exc.detail))
            preview_manifest = await get_presentation_preview_manifest(
                sql_session,
                presentation.id,
            )

        edit_path = (
            f"/presentation?id={presentation.id}&font={quote_plus(presentation.template_font)}"
            if presentation.template_font
            else f"/presentation?id={presentation.id}"
        )
        status.status = "completed"
        status.message = "Selected slides generated"
        status.updated_at = datetime.now()
        status.error = None
        status.data = {
            **(status.data or {}),
            "presentation_id": str(presentation.id),
            "path": None,
            "edit_path": edit_path,
            "slide_indices": request.slide_indices,
            "generated_slide_indices": request.slide_indices,
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
        status.message = "Selected slide generation failed"
        status.updated_at = datetime.now()
        status.error = {"detail": str(getattr(exc, "detail", exc))}
        sql_session.add(status)
        await sql_session.commit()
        raise


def _request_outline(
    request: GenerateSelectedSlidesRequest,
) -> PresentationOutlineModel:
    return PresentationOutlineModel(
        slides=[
            SlideOutlineModel(**slide.model_dump(mode="json"))
            for slide in request.slides_markdown
        ]
    )


async def _prepare_structure(*args, **kwargs) -> PresentationModel:
    from services.presentation_service import PresentationService

    return await PresentationService.prepare_structure(*args, **kwargs)
