from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user_or_api_key
from api.v1.ppt.endpoints.templates import TEMPLATES_ROUTER
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from services.template_prompt_profile_service import PromptProfileConflictError
from utils.template_image_summary import build_layout_image_summary
from utils.template_prompt_overrides import (
    apply_prompt_profile_to_layout,
    build_prompt_profile_revision,
    get_active_template_prompt,
    merge_generation_instructions,
)
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
    assert len(payload["revision"]["fingerprint"]) == 64
    assert payload["revision"]["updated_at"] is None
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


def test_prompt_revision_is_stable_for_equivalent_payloads_and_changes_with_prompt():
    first = _profile(
        layout_prompts={
            "second": {"layout_prompt": "B"},
            "first": {"layout_prompt": "A"},
        }
    )
    reordered = _profile(
        layout_prompts={
            "first": {"layout_prompt": "A"},
            "second": {"layout_prompt": "B"},
        }
    )
    changed = _profile(
        template_prompt="Changed template prompt",
        layout_prompts=reordered.layout_prompts,
    )

    assert (
        build_prompt_profile_revision(first)["fingerprint"]
        == build_prompt_profile_revision(reordered)["fingerprint"]
    )
    assert (
        build_prompt_profile_revision(first)["fingerprint"]
        != build_prompt_profile_revision(changed)["fingerprint"]
    )


def test_template_prompt_is_added_to_generation_instructions_only_when_active():
    profile = _profile(template_prompt="Keep the story concise")

    assert get_active_template_prompt(profile) == "Keep the story concise"
    assert merge_generation_instructions(
        "Use the supplied facts",
        get_active_template_prompt(profile),
    ) == (
        "Use the supplied facts\n\n"
        "Template-level instructions:\nKeep the story concise"
    )
    assert get_active_template_prompt(_profile(is_active=False)) is None


def test_patch_template_prompt_profile_returns_conflict_for_stale_fingerprint():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    user = SimpleNamespace(id=uuid4())
    app.dependency_overrides[get_current_user_or_api_key] = lambda: user
    client = TestClient(app)
    template = SimpleNamespace(id=uuid4(), is_system=True)

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=template),
    ), patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.upsert",
        new=AsyncMock(side_effect=PromptProfileConflictError("new-fingerprint")),
    ) as mock_upsert:
        response = client.patch(
            "/api/v1/ppt/templates/general/prompt-profile",
            json={
                "template_prompt": "Updated prompt",
                "expected_fingerprint": "stale-fingerprint",
            },
        )

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "prompt_profile_conflict",
        "message": "The prompt profile changed since it was loaded.",
        "current_fingerprint": "new-fingerprint",
    }
    assert mock_upsert.await_args.kwargs["expected_fingerprint"] == "stale-fingerprint"


def test_prompt_profile_history_endpoint_keeps_pagination_contract():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)
    revision_id = uuid4()
    history = {
        "items": [
            {
                "revision_id": revision_id,
                "version": 3,
                "fingerprint": "f" * 64,
                "action": "update",
                "change_count": 2,
                "changed_layout_ids": ["hero-slide"],
                "author": "Editor",
                "created_at": datetime(2026, 7, 13, 8, 30, tzinfo=timezone.utc),
                "is_current": True,
                "restored_from_revision_id": None,
            }
        ],
        "total": 3,
        "limit": 1,
        "offset": 2,
    }

    with patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.list_history",
        new=AsyncMock(return_value=history),
    ) as mock_list:
        response = client.get(
            "/api/v1/ppt/templates/general/prompt-profile/history?limit=1&offset=2"
        )

    assert response.status_code == 200
    assert response.json()["items"][0]["revision_id"] == str(revision_id)
    assert response.json()["items"][0]["created_at"] == "2026-07-13T08:30:00Z"
    mock_list.assert_awaited_once_with(template_slug="general", limit=1, offset=2)


def test_restore_prompt_profile_returns_conflict_without_mutating_current_profile():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    user = SimpleNamespace(id=uuid4())
    app.dependency_overrides[get_current_user_or_api_key] = lambda: user
    client = TestClient(app)
    revision_id = uuid4()

    with patch(
        "api.v1.ppt.endpoints.templates.template_prompt_profile_service.restore",
        new=AsyncMock(side_effect=PromptProfileConflictError("current-fingerprint")),
    ) as mock_restore:
        response = client.post(
            f"/api/v1/ppt/templates/general/prompt-profile/history/{revision_id}/restore",
            json={"expected_current_fingerprint": "stale-fingerprint"},
        )

    assert response.status_code == 409
    assert response.json()["detail"]["current_fingerprint"] == "current-fingerprint"
    mock_restore.assert_awaited_once_with(
        template_slug="general",
        revision_id=revision_id,
        expected_current_fingerprint="stale-fingerprint",
        restored_by_id=user.id,
    )
