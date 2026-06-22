from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user_or_api_key
from api.v1.ppt.endpoints.templates import TEMPLATES_ROUTER
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from utils.template_image_summary import build_layout_image_summary
from utils.template_prompt_overrides import apply_prompt_profile_to_layout
from utils.template_schema_summary import build_template_schema_summary


def _layout() -> PresentationLayoutModel:
    return PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="general:hero-slide",
                name="Hero Slide",
                description="Original hero layout description",
                json_schema={
                    "title": "Hero",
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Original title prompt",
                        },
                        "image": {
                            "type": "object",
                            "default": {
                                "__image_prompt__": "Original image prompt",
                            },
                            "properties": {
                                "__image_prompt__": {
                                    "type": "string",
                                    "description": "Original image field prompt",
                                    "default": "Original image prompt",
                                }
                            },
                        },
                    },
                },
            )
        ],
    )


def _profile(**overrides):
    data = {
        "id": uuid4(),
        "template_slug": "general",
        "template_id": None,
        "is_active": True,
        "template_prompt": "Template prompt",
        "layout_prompts": {
            "hero-slide": {
                "layout_prompt": "Edited hero layout prompt",
                "field_prompts": {
                    "title": "Edited title prompt",
                    "image.__image_prompt__": "Edited image field prompt",
                },
                "image_prompt_overrides": {
                    "image.__image_prompt__": "Edited image generation prompt"
                },
            }
        },
        "created_at": None,
        "updated_at": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_apply_prompt_profile_to_layout_overrides_schema_and_image_defaults():
    layout = apply_prompt_profile_to_layout(_layout(), _profile())

    slide = layout.slides[0]
    assert slide.description == "Edited hero layout prompt"
    assert slide.json_schema["properties"]["title"]["description"] == "Edited title prompt"
    assert (
        slide.json_schema["properties"]["image"]["properties"]["__image_prompt__"][
            "description"
        ]
        == "Edited image field prompt"
    )
    assert (
        slide.json_schema["properties"]["image"]["default"]["__image_prompt__"]
        == "Edited image generation prompt"
    )

    schema_summary = build_template_schema_summary("general", layout, None)
    fields = {
        item["path"]: item
        for item in schema_summary["layouts"][0]["fields_summary"]
    }
    assert schema_summary["layouts"][0]["layout_description"] == "Edited hero layout prompt"
    assert fields["title"]["description"] == "Edited title prompt"

    image_summary = build_layout_image_summary("general", layout)
    assert image_summary["slides"][0]["image_prompts"] == [
        "Edited image generation prompt"
    ]


def test_apply_prompt_profile_to_layout_no_profile_keeps_old_behavior():
    layout = _layout()
    unchanged = apply_prompt_profile_to_layout(layout, None)

    assert unchanged is layout
    schema_summary = build_template_schema_summary("general", unchanged, None)
    image_summary = build_layout_image_summary("general", unchanged)

    assert (
        schema_summary["layouts"][0]["layout_description"]
        == "Original hero layout description"
    )
    assert image_summary["slides"][0]["image_prompts"] == ["Original image prompt"]


def test_get_template_prompt_profile_returns_current_overrides():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    template_id = uuid4()
    template = SimpleNamespace(
        id=template_id,
        name="General",
        slug="general",
        description="Source template description",
        is_system=True,
        layouts=None,
    )

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=template),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=apply_prompt_profile_to_layout(_layout(), _profile())),
    ), patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=_profile()),
    ):
        response = client.get("/api/v1/ppt/templates/general/prompt-profile")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template"] == "general"
    assert payload["template_id"] == str(template_id)
    assert payload["template_type"] == "built-in"
    assert payload["source_prompt"] == "Source template description"
    assert payload["prompt_profile"]["template_prompt"] == "Template prompt"
    assert (
        payload["schema_summary"]["layouts"][0]["layout_description"]
        == "Edited hero layout prompt"
    )
    assert payload["image_summary"]["slides"][0]["image_prompts"] == [
        "Edited image generation prompt"
    ]


def test_patch_template_prompt_profile_supports_custom_legacy_slug():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    template_id = uuid4()
    slug = f"custom-{template_id}"
    user = SimpleNamespace(id=uuid4())
    template = SimpleNamespace(
        id=template_id,
        name="Legacy custom",
        slug=slug,
        description="Legacy source prompt",
        is_system=False,
        layouts=[],
    )
    saved_profile = _profile(
        template_slug=slug,
        template_id=template_id,
        template_prompt="Saved template prompt",
        layout_prompts={"hero-slide": {"layout_prompt": "Saved layout prompt"}},
    )

    app.dependency_overrides[get_current_user_or_api_key] = lambda: user

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ), patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_id",
        new=AsyncMock(return_value=template),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_current_user_or_api_key",
        return_value=user,
    ), patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.upsert",
        new=AsyncMock(return_value=saved_profile),
    ) as mock_upsert, patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.get_by_slug",
        new=AsyncMock(return_value=saved_profile),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=apply_prompt_profile_to_layout(_layout(), saved_profile)),
    ):
        response = client.patch(
            f"/api/v1/ppt/templates/{slug}/prompt-profile",
            json={
                "template_prompt": " Saved template prompt ",
                "layout_prompts": {
                    "hero-slide": {
                        "layout_description": " Saved layout prompt ",
                        "field_prompts": {"title": ""},
                    }
                },
            },
        )

    assert response.status_code == 200
    kwargs = mock_upsert.await_args.kwargs
    assert kwargs["template_slug"] == slug
    assert kwargs["template_id"] == template_id
    assert kwargs["template_prompt"] == "Saved template prompt"
    assert kwargs["layout_prompts"] == {
        "hero-slide": {"layout_prompt": "Saved layout prompt"}
    }
    assert response.json()["template_type"] == "custom"
