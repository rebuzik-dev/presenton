from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select

from models.derive_regenerate import DeriveRegenerateRequest
from models.selected_generation import IndexedSlideMarkdownInput
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.presentation_preview import PresentationPreviewManifest
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services.selective_regeneration_service import (
    prepare_derived_regeneration,
    run_derived_regeneration,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def session(tmp_path):
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'selective-regeneration.db'}"
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
                description="Current hero prompt",
                json_schema={"type": "object", "properties": {}},
            ),
            SlideLayoutModel(
                id="general:content",
                name="Content",
                description="Current content prompt",
                json_schema={"type": "object", "properties": {}},
            ),
        ],
    )


async def _seed_source(session):
    source = PresentationModel(
        id=uuid4(),
        content="Source",
        n_slides=2,
        language="English",
        instructions="Use source facts",
        outlines={
            "slides": [
                {"content": "First outline"},
                {"content": "Second outline"},
            ]
        },
        layout=_layout().model_dump(mode="json"),
        structure={"slides": [0, 1]},
    )
    slides = [
        SlideModel(
            presentation=source.id,
            layout_group="general",
            layout="general:hero",
            index=0,
            content={"title": "Keep me"},
            properties={"colors": {"accent": "#fff"}},
        ),
        SlideModel(
            presentation=source.id,
            layout_group="general",
            layout="general:content",
            index=1,
            content={"title": "Replace me"},
            properties={"block_overrides": {"title": "old"}},
        ),
    ]
    session.add(source)
    session.add_all(slides)
    await session.commit()
    return source


def test_derive_request_rejects_duplicate_indices():
    with pytest.raises(ValidationError):
        DeriveRegenerateRequest(
            request_id=uuid4(),
            slide_indices=[1, 1],
        )


@pytest.mark.anyio
async def test_prepare_derive_is_idempotent_and_clones_full_deck(session):
    source = await _seed_source(session)
    request_id = uuid4()

    status, created = await prepare_derived_regeneration(
        session,
        source_id=source.id,
        request_id=request_id,
        slide_indices=[1],
    )
    repeated_status, repeated_created = await prepare_derived_regeneration(
        session,
        source_id=source.id,
        request_id=request_id,
        slide_indices=[1],
    )

    derived_slides = list(
        await session.scalars(
            select(SlideModel)
            .where(SlideModel.presentation == request_id)
            .order_by(SlideModel.index)
        )
    )
    assert created is True
    assert repeated_created is False
    assert repeated_status.id == status.id
    assert [slide.content for slide in derived_slides] == [
        {"title": "Keep me"},
        {"title": "Replace me"},
    ]
    assert all(slide.presentation == request_id for slide in derived_slides)


@pytest.mark.anyio
async def test_prepare_derive_applies_outline_override_without_mutating_source(session):
    source = await _seed_source(session)
    request_id = uuid4()
    await prepare_derived_regeneration(
        session,
        source_id=source.id,
        request_id=request_id,
        slide_indices=[1],
        outline_overrides=[
            IndexedSlideMarkdownInput(
                index=1,
                content="Updated copy",
                image_prompt="New image",
            )
        ],
    )
    await session.refresh(source)
    derived = await session.get(PresentationModel, request_id)
    assert source.get_presentation_outline().slides[1].content == "Second outline"
    assert derived.get_presentation_outline().slides[1].content == "Updated copy"
    assert derived.get_presentation_outline().slides[1].image_prompt == "New image"


@pytest.mark.anyio
async def test_regeneration_changes_only_selected_slide_and_records_metadata(
    session,
    tmp_path,
):
    source = await _seed_source(session)
    request_id = uuid4()
    await prepare_derived_regeneration(
        session,
        source_id=source.id,
        request_id=request_id,
        slide_indices=[1],
    )
    profile = SimpleNamespace(
        is_active=True,
        template_prompt="Use the approved template voice",
        layout_prompts={},
        updated_at=None,
    )
    preview = PresentationPreviewManifest(
        presentation_id=request_id,
        revision="a" * 64,
        state="ready",
        slides=[],
    )

    with patch(
        "services.partial_deck_service.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=profile),
    ), patch(
        "services.partial_deck_service.get_layout_by_name",
        new=AsyncMock(return_value=_layout()),
    ), patch(
        "services.partial_deck_service._generate_slide_content",
        new=AsyncMock(return_value={"title": "Regenerated"}),
    ) as generate_content, patch(
        "services.partial_deck_service.process_slide_add_placeholder_assets"
    ), patch(
        "services.partial_deck_service.process_slide_and_fetch_assets",
        new=AsyncMock(return_value=[]),
    ), patch(
        "services.partial_deck_service.get_images_directory",
        return_value=str(tmp_path / "images"),
    ), patch(
        "services.selective_regeneration_service.ensure_presentation_preview_manifest",
        new=AsyncMock(return_value=preview),
    ):
        await run_derived_regeneration(
            session,
            presentation_id=request_id,
            source_id=source.id,
            slide_indices=[1],
            auth_token=None,
            api_key=None,
            preview_auth_context={"headers": {}, "params": {}},
        )

    source_slides = list(
        await session.scalars(
            select(SlideModel)
            .where(SlideModel.presentation == source.id)
            .order_by(SlideModel.index)
        )
    )
    derived_slides = list(
        await session.scalars(
            select(SlideModel)
            .where(SlideModel.presentation == request_id)
            .order_by(SlideModel.index)
        )
    )
    status = await session.get(AsyncPresentationGenerationTaskModel, request_id)

    assert source_slides[1].content == {"title": "Replace me"}
    assert derived_slides[0].content == source_slides[0].content
    assert derived_slides[0].properties == source_slides[0].properties
    assert derived_slides[1].content == {"title": "Regenerated"}
    assert derived_slides[1].properties["generationState"] == "generated"
    assert derived_slides[1].layout == "general:content"
    assert generate_content.await_args.args[5].endswith(
        "Use the approved template voice"
    )
    assert status.status == "completed"
    assert status.data["source_presentation_id"] == str(source.id)
    assert status.data["slide_indices"] == [1]
    assert len(status.data["prompt_revision"]["fingerprint"]) == 64
    assert status.data["preview_manifest"]["state"] == "ready"
