from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select

from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.presentation_preview import PresentationPreviewManifest
from models.selected_generation import GenerateSelectedSlidesRequest
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.selected_generation_service import (
    prepare_selected_generation,
    run_selected_generation,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def session(tmp_path):
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'selected-generation.db'}"
    )
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: SQLModel.metadata.create_all(
                sync_connection,
                tables=[
                    PresentationModel.__table__,
                    SlideModel.__table__,
                    AsyncPresentationGenerationTaskModel.__table__,
                ],
            )
        )
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as sql_session:
        yield sql_session
    await engine.dispose()


def _layout():
    return PresentationLayoutModel(
        name="general",
        ordered=True,
        slides=[
            SlideLayoutModel(
                id="general:hero",
                name="Hero",
                json_schema={"type": "object", "properties": {}},
            ),
            SlideLayoutModel(
                id="general:content",
                name="Content",
                json_schema={"type": "object", "properties": {}},
            ),
        ],
    )


@pytest.mark.anyio
async def test_selected_generation_creates_full_shell_and_partial_metadata(session, tmp_path):
    request = GenerateSelectedSlidesRequest(
        request_id=uuid4(),
        template="general",
        slides_markdown=[
            {"content": "Opening"},
            {"content": "Details", "image_prompt": "Editorial photo"},
        ],
        slide_indices=[1],
    )
    status, created = await prepare_selected_generation(session, request=request)
    repeated, repeated_created = await prepare_selected_generation(
        session,
        request=request,
    )
    assert created is True
    assert repeated_created is False
    assert repeated.id == status.id

    async def prepare_structure(sql_session, presentation_id, layout, **_kwargs):
        presentation = await sql_session.get(PresentationModel, presentation_id)
        presentation.set_layout(layout)
        presentation.set_structure(type("Structure", (), {"model_dump": lambda self: {"slides": [0, 1]}})())
        sql_session.add(presentation)
        await sql_session.commit()
        return presentation

    profile = SimpleNamespace(
        is_active=True,
        template_prompt=None,
        layout_prompts={},
        updated_at=None,
    )
    preview = PresentationPreviewManifest(
        presentation_id=request.request_id,
        revision="b" * 64,
        state="ready",
        slides=[],
    )
    with patch(
        "services.selected_generation_service.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=profile),
    ), patch(
        "services.selected_generation_service.get_layout_by_name",
        new=AsyncMock(return_value=_layout()),
    ), patch(
        "services.selected_generation_service._prepare_structure",
        side_effect=prepare_structure,
    ), patch(
        "services.partial_deck_service.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=profile),
    ), patch(
        "services.partial_deck_service.get_layout_by_name",
        new=AsyncMock(return_value=_layout()),
    ), patch(
        "services.partial_deck_service._generate_slide_content",
        new=AsyncMock(return_value={"title": "Generated details"}),
    ), patch(
        "services.partial_deck_service.process_slide_add_placeholder_assets",
    ), patch(
        "services.partial_deck_service.process_slide_and_fetch_assets",
        new=AsyncMock(return_value=[]),
    ), patch(
        "services.partial_deck_service.get_images_directory",
        return_value=str(tmp_path / "images"),
    ), patch(
        "services.selected_generation_service.ensure_presentation_preview_manifest",
        new=AsyncMock(return_value=preview),
    ):
        await run_selected_generation(
            session,
            request=request,
            auth_token=None,
            api_key=None,
            preview_auth_context={"headers": {}, "params": {}},
        )

    slides = list(
        await session.scalars(
            select(SlideModel)
            .where(SlideModel.presentation == request.request_id)
            .order_by(SlideModel.index)
        )
    )
    completed = await session.get(
        AsyncPresentationGenerationTaskModel,
        request.request_id,
    )
    assert len(slides) == 2
    assert slides[0].properties["generationState"] == "not_generated"
    assert slides[1].properties["generationState"] == "generated"
    assert completed.data["generated_slide_indices"] == [1]
    assert completed.data["pending_slide_indices"] == [0]
    assert completed.data["deck_state"] == "partial"
