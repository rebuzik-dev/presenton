from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.v1.ppt.endpoints.templates import TEMPLATES_ROUTER
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel


def _build_schema_layout() -> PresentationLayoutModel:
    return PresentationLayoutModel(
        name="catering",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="catering:header-color-cards-image-slide",
                name="Header Color Cards Image Slide",
                description="Palette layout",
                json_schema={
                    "title": "Palette Slide",
                    "type": "object",
                    "properties": {
                        "colorCards": {
                            "type": "array",
                            "maxItems": 6,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "hex": {"type": "string"},
                                    "group": {
                                        "type": "string",
                                        "enum": ["primary", "secondary"],
                                    },
                                },
                            },
                        },
                        "image": {
                            "type": "object",
                            "properties": {"__image_prompt__": {"type": "string"}},
                        },
                    },
                },
            )
        ],
    )


def test_get_template_schema_summary_success():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    mock_template = SimpleNamespace(
        layouts=[
            {
                "name": "HeaderColorCardsImageSlideLayout",
                "file": "HeaderColorCardsImageSlideLayout.tsx",
            }
        ]
    )

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=mock_template),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=_build_schema_layout()),
    ):
        response = client.get("/api/v1/ppt/templates/catering/schema-summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template"] == "catering"
    assert payload["layout_count"] == 1

    layout = payload["layouts"][0]
    assert layout["layout_id"] == "catering:header-color-cards-image-slide"
    assert layout["content_slots"]["image_slots"] == 1
    assert any(
        f["path"] == "colorCards[].group" and f["enum_values"] == ["primary", "secondary"]
        for f in layout["fields_summary"]
    )


def test_get_template_schema_summary_propagates_auth_context():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(return_value=_build_schema_layout()),
    ) as mock_get_layout:
        response = client.get(
            "/api/v1/ppt/templates/catering/schema-summary?token=query-token&api_key=query-key",
            headers={"Authorization": "Bearer header-token", "X-API-Key": "header-key"},
        )

    assert response.status_code == 200
    kwargs = mock_get_layout.await_args.kwargs
    assert kwargs["auth_token"] == "header-token"
    assert kwargs["api_key"] == "header-key"


def test_get_template_schema_summary_not_found():
    app = FastAPI()
    app.include_router(TEMPLATES_ROUTER, prefix="/api/v1/ppt")
    client = TestClient(app)

    with patch(
        "api.v1.ppt.endpoints.templates.template_service.get_by_slug",
        new=AsyncMock(return_value=None),
    ), patch(
        "api.v1.ppt.endpoints.templates.get_layout_by_name",
        new=AsyncMock(
            side_effect=HTTPException(status_code=404, detail="Template not found")
        ),
    ):
        response = client.get("/api/v1/ppt/templates/unknown/schema-summary")

    assert response.status_code == 404
    assert response.json()["detail"] == "Template not found"

