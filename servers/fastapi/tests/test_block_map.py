import asyncio
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.v1.ppt.endpoints.presentation import PRESENTATION_ROUTER
from api.v1.ppt.endpoints.templates import TEMPLATES_ROUTER
from services.database import get_async_session
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel


def _layout() -> PresentationLayoutModel:
    return PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="general:hero-slide",
                name="Hero Slide",
                description="Hero slide layout prompt",
                json_schema={
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Write a short headline",
                        },
                        "bullets": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "description": "Write a concise bullet",
                            },
                        },
                        "image": {
                            "type": "object",
                            "default": {
                                "__image_prompt__": "Original hero image prompt",
                            },
                            "properties": {
                                "__image_prompt__": {
                                    "type": "string",
                                    "description": "Describe the hero image",
                                    "default": "Original hero image prompt",
                                },
                            },
                        },
                    },
                },
            )
        ],
    )


def test_semantic_label_for_path_has_human_fallbacks():
    from utils.block_map import semantic_label_for_path

    assert semantic_label_for_path("title") == "Заголовок"
    assert semantic_label_for_path("subtitle") == "Подзаголовок"
    assert semantic_label_for_path("bullets[0]") == "Пункт списка 1"
    assert semantic_label_for_path("cards[2].description") == "Описание карточки 3"
    assert semantic_label_for_path("image.__image_prompt__") == "Промпт изображения"


def test_build_slide_block_map_merges_content_prompt_profile_and_overrides():
    from utils.block_map import build_editable_block_id, build_slide_block_map

    presentation_id = uuid4()
    presentation = PresentationModel(
        id=presentation_id,
        content="Brief",
        n_slides=1,
        language="Russian",
        layout=_layout().model_dump(),
    )
    title_block_id = build_editable_block_id("general:hero-slide", "text", "title")
    slide = SlideModel(
        id=uuid4(),
        presentation=presentation_id,
        layout_group="general",
        layout="general:hero-slide",
        index=0,
        content={
            "title": "Original title",
            "bullets": ["First point"],
            "image": {"__image_prompt__": "Current image prompt"},
        },
        properties={
            "blockOverrides": {
                title_block_id: {
                    "semantic_name": "Главный заголовок",
                    "description": "Primary message",
                    "prompt_override": "Make it more premium",
                }
            }
        },
    )
    profile = SimpleNamespace(
        is_active=True,
        layout_prompts={
            "hero-slide": {
                "field_prompts": {"title": "Profile title prompt"},
                "image_prompt_overrides": {
                    "image.__image_prompt__": "Profile image prompt"
                },
            }
        },
    )

    blocks = build_slide_block_map(
        presentation=presentation,
        slide=slide,
        layout=_layout(),
        prompt_profile=profile,
    )

    title = next(block for block in blocks if block.schema_path == "title")
    image = next(block for block in blocks if block.schema_path == "image.__image_prompt__")

    assert title.block_id == title_block_id
    assert title.semantic_name == "Главный заголовок"
    assert title.description == "Primary message"
    assert title.content.text == "Original title"
    assert title.prompt.source == "override"
    assert title.prompt.text == "Profile title prompt"
    assert title.prompt.override_text == "Make it more premium"
    assert title.debug["raw_path"] == "slides[0].title"

    assert image.type == "image"
    assert image.content.image_prompt == "Current image prompt"
    assert image.prompt.source == "template_prompt_profile"
    assert image.prompt.text == "Profile image prompt"


def test_build_slide_block_map_expands_array_text_and_image_prompt_paths():
    from utils.block_map import build_slide_block_map

    layout = PresentationLayoutModel(
        name="catering",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="catering:header-three-image-cards",
                name="Header Three Image Cards Slide",
                description="A slide with a header and a row of image cards.",
                json_schema={
                    "type": "object",
                    "properties": {
                        "cards": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {
                                        "type": "string",
                                        "description": "Card title. Max 3 words",
                                    },
                                    "image": {
                                        "type": "object",
                                        "properties": {
                                            "__image_prompt__": {
                                                "type": "string",
                                                "description": "Card image prompt",
                                                "default": "Decor image",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            )
        ],
    )
    presentation_id = uuid4()
    presentation = PresentationModel(
        id=presentation_id,
        content="Brief",
        n_slides=1,
        language="Russian",
        layout=layout.model_dump(),
    )
    slide = SlideModel(
        id=uuid4(),
        presentation=presentation_id,
        layout_group="catering",
        layout="catering:header-three-image-cards",
        index=0,
        content={
            "cards": [
                {
                    "title": "Flowers",
                    "image": {"__image_prompt__": "Flower decor"},
                },
                {
                    "title": "Serving",
                    "image": {"__image_prompt__": "Table setting"},
                },
            ],
        },
        properties=None,
    )

    blocks = build_slide_block_map(
        presentation=presentation,
        slide=slide,
        layout=layout,
        prompt_profile=None,
    )
    by_path = {block.schema_path: block for block in blocks}

    assert "cards[0].title" in by_path
    assert "cards[1].title" in by_path
    assert "cards[0].image.__image_prompt__" in by_path
    assert "cards[1].image.__image_prompt__" in by_path
    assert "cards[].title" not in by_path
    assert "cards[].image.__image_prompt__" not in by_path
    assert by_path["cards[0].title"].content.text == "Flowers"
    assert by_path["cards[1].title"].content.text == "Serving"
    assert by_path["cards[0].image.__image_prompt__"].type == "image"
    assert by_path["cards[0].image.__image_prompt__"].content.image_prompt == "Flower decor"
    assert by_path["cards[1].image.__image_prompt__"].content.image_prompt == "Table setting"


def test_apply_block_patch_updates_properties_and_text(fake_async_session):
    from models.block_map import EditableBlockPatchRequest
    from utils.block_map import apply_block_patch, build_editable_block_id

    slide = SlideModel(
        id=uuid4(),
        presentation=uuid4(),
        layout_group="general",
        layout="general:hero-slide",
        index=0,
        content={"title": "Before"},
        properties=None,
    )
    block_id = build_editable_block_id("general:hero-slide", "text", "title")

    patched = asyncio.run(
        apply_block_patch(
            fake_async_session,
            slide,
            block_id,
            EditableBlockPatchRequest(
                schema_path="title",
                semantic_name="Главный заголовок",
                description="Updated description",
                text="After",
                prompt_override="Shorter title",
            ),
        ),
    )

    assert patched.content["title"] == "After"
    assert patched.properties["blockOverrides"][block_id]["semantic_name"] == "Главный заголовок"
    assert patched.properties["blockOverrides"][block_id]["description"] == "Updated description"
    assert patched.properties["blockOverrides"][block_id]["text"] == "After"
    assert patched.properties["blockOverrides"][block_id]["prompt_override"] == "Shorter title"
    assert "updated_at" in patched.properties["blockOverrides"][block_id]
    assert fake_async_session.added == [slide]
    assert fake_async_session.commit_count == 1


class _SlideSession:
    def __init__(self, presentation, slide):
        self.presentation = presentation
        self.slide = slide
        self.added = []
        self.commit_count = 0

    async def get(self, _model, key):
        return self.presentation if key == self.presentation.id else None

    async def scalars(self, *_args, **_kwargs):
        return [self.slide]

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commit_count += 1


def _client_with_session(session):
    app = FastAPI()

    async def override_session():
        yield session

    app.dependency_overrides[get_async_session] = override_session
    app.include_router(PRESENTATION_ROUTER, prefix="/api/v1/ppt")
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    return TestClient(app)


def test_get_slide_blocks_endpoint_returns_block_map():
    presentation_id = uuid4()
    presentation = PresentationModel(
        id=presentation_id,
        content="Brief",
        n_slides=1,
        language="Russian",
        layout=_layout().model_dump(),
    )
    slide = SlideModel(
        id=uuid4(),
        presentation=presentation_id,
        layout_group="general",
        layout="general:hero-slide",
        index=0,
        content={"title": "Visible title"},
        properties=None,
    )
    client = _client_with_session(_SlideSession(presentation, slide))

    with patch(
        "api.v1.ppt.endpoints.presentation.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ):
        response = client.get(
            f"/api/v1/ppt/presentation/{presentation_id}/slides/0/blocks"
        )

    assert response.status_code == 200
    payload = response.json()
    assert any(
        block["schema_path"] == "title"
        and block["semantic_name"] == "Заголовок"
        and block["content"]["text"] == "Visible title"
        for block in payload
    )


def test_patch_slide_block_endpoint_persists_override():
    from utils.block_map import build_editable_block_id

    presentation_id = uuid4()
    presentation = PresentationModel(
        id=presentation_id,
        content="Brief",
        n_slides=1,
        language="Russian",
        layout=_layout().model_dump(),
    )
    slide = SlideModel(
        id=uuid4(),
        presentation=presentation_id,
        layout_group="general",
        layout="general:hero-slide",
        index=0,
        content={"title": "Before"},
        properties=None,
    )
    session = _SlideSession(presentation, slide)
    client = _client_with_session(session)
    block_id = build_editable_block_id("general:hero-slide", "text", "title")

    with patch(
        "api.v1.ppt.endpoints.presentation.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ):
        response = client.patch(
            f"/api/v1/ppt/presentation/{presentation_id}/slides/0/blocks/{block_id}",
            json={
                "schema_path": "title",
                "semantic_name": "Главный заголовок",
                "text": "After",
                "prompt_override": "Make it concise",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["block"]["content"]["text"] == "After"
    assert slide.content["title"] == "After"
    assert slide.properties["blockOverrides"][block_id]["prompt_override"] == "Make it concise"
    assert session.commit_count == 1


def test_get_template_block_map_endpoint_returns_readonly_blocks():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=_layout()),
    ), patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ):
        response = client.get("/api/v1/ppt/templates/general/block-map")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template"] == "general"
    assert any(block["schema_path"] == "title" for block in payload["blocks"])
