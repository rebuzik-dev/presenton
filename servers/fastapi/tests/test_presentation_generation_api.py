import asyncio
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import BackgroundTasks, HTTPException, Request
from pydantic import ValidationError

from api.v1.ppt.endpoints.autogenerate import autogenerate_presentation
from models.generate_presentation_request import GeneratePresentationRequest
from models.sql.presentation import PresentationModel


class FakeAsyncSession:
    def add(self, *_args, **_kwargs):
        return None

    async def commit(self):
        return None


def _request() -> Request:
    return Request({"type": "http", "headers": [], "query_string": b""})


class TestPresentationGenerationAPI:
    @pytest.mark.parametrize("export_as", ["pdf", "pptx"])
    def test_generate_presentation_accepts_supported_export_types(self, export_as):
        request = GeneratePresentationRequest(
            content="Create a presentation about artificial intelligence and machine learning",
            n_slides=5,
            language="English",
            export_as=export_as,
            template="general",
        )
        presentation_id = uuid.uuid4()
        background_tasks = BackgroundTasks()

        with patch(
            "api.v1.ppt.endpoints.autogenerate.PresentationService.create_presentation",
            new=AsyncMock(
                return_value=PresentationModel(
                    id=presentation_id,
                    content=request.content,
                    n_slides=request.n_slides,
                )
            ),
        ) as mock_create:
            response = asyncio.run(
                autogenerate_presentation(
                    request,
                    _request(),
                    background_tasks,
                    sql_session=FakeAsyncSession(),
                )
            )

        assert response["presentation_id"] == str(presentation_id)
        assert response["status"] == "pending"
        assert len(background_tasks.tasks) == 1
        mock_create.assert_awaited_once()

    def test_generate_presentation_with_no_content(self):
        with pytest.raises(ValidationError):
            GeneratePresentationRequest.model_validate(
                {
                    "n_slides": 5,
                    "language": "English",
                    "export_as": "pdf",
                    "template": "general",
                }
            )

    def test_generate_presentation_with_n_slides_less_than_one(self):
        request = GeneratePresentationRequest(
            content="Create a presentation about artificial intelligence and machine learning",
            n_slides=0,
            language="English",
            export_as="pdf",
            template="general",
        )

        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                autogenerate_presentation(
                    request,
                    _request(),
                    BackgroundTasks(),
                    sql_session=FakeAsyncSession(),
                )
            )

        assert exc.value.status_code == 400
        assert exc.value.detail == "n_slides must be at least 1"

    def test_generate_presentation_with_invalid_export_type(self):
        with pytest.raises(ValidationError):
            GeneratePresentationRequest.model_validate(
                {
                    "content": "Create a presentation about artificial intelligence and machine learning",
                    "n_slides": 5,
                    "language": "English",
                    "export_as": "invalid_type",
                    "template": "general",
                }
            )
