from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.v1.ppt.endpoints.templates import TEMPLATES_ROUTER
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel


def _build_sample_layout() -> PresentationLayoutModel:
    return PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="hero-slide",
                name="Hero Slide",
                description="Main hero slide",
                json_schema={
                    "title": "Hero Slide",
                    "type": "object",
                    "properties": {
                        "image": {
                            "type": "object",
                            "properties": {"__image_prompt__": {"type": "string"}},
                        }
                    },
                },
            ),
            SlideLayoutModel(
                id="team-slide",
                name="Team Slide",
                description="Team gallery",
                json_schema={
                    "title": "Team Slide",
                    "type": "object",
                    "properties": {
                        "teamMembers": {
                            "type": "array",
                            "maxItems": 3,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "image": {
                                        "type": "object",
                                        "properties": {
                                            "__image_prompt__": {"type": "string"}
                                        },
                                    }
                                },
                            },
                        }
                    },
                },
            ),
        ],
    )


def test_get_template_image_summary_success():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=_build_sample_layout()),
    ) as mock_get_layout:
        response = client.get("/api/v1/ppt/templates/general/image-summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template"] == "general"
    assert payload["total_image_prompt_slots"] == 4
    assert len(payload["slides"]) == 2
    assert payload["slides"][0]["image_prompt_slots"] == 1
    assert payload["slides"][1]["image_prompt_slots"] == 3
    assert "Schema: Hero Slide" in payload["slides"][0]["slide_description"]

    mock_get_layout.assert_awaited_once()


def test_get_template_image_summary_propagates_auth_context():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=_build_sample_layout()),
    ) as mock_get_layout:
        response = client.get(
            "/api/v1/ppt/templates/general/image-summary?token=query-token&api_key=query-key",
            headers={"Authorization": "Bearer header-token", "X-API-Key": "header-key"},
        )

    assert response.status_code == 200
    kwargs = mock_get_layout.await_args.kwargs
    assert kwargs["auth_token"] == "header-token"
    assert kwargs["api_key"] == "header-key"


def test_get_template_image_summary_not_found():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(side_effect=HTTPException(status_code=404, detail="Template not found")),
    ):
        response = client.get("/api/v1/ppt/templates/unknown/image-summary")

    assert response.status_code == 404
    assert response.json()["detail"] == "Template not found"

