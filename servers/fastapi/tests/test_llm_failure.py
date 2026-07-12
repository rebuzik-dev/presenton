import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from models.presentation_layout import SlideLayoutModel
from models.presentation_outline_model import SlideOutlineModel
from utils.llm_calls.generate_slide_content import (
    get_slide_content_from_type_and_outline,
)
from utils.llm_failure import classify_llm_exception
from api.v1.ppt.endpoints.presentation import _run_background_job_safely


class ProviderError(Exception):
    def __init__(self, status_code: int, error: dict, headers: dict | None = None):
        super().__init__(error.get("message") or "provider error")
        self.status_code = status_code
        self.body = {"error": error}
        self.response = SimpleNamespace(
            status_code=status_code,
            headers=headers or {},
        )


LAYOUT = SlideLayoutModel(
    id="content",
    json_schema={
        "type": "object",
        "properties": {"title": {"type": "string"}},
        "required": ["title"],
    },
)
OUTLINE = SlideOutlineModel(content="Test slide")


async def _raise_background_error():
    raise RuntimeError("background failed")


def _run_with_side_effect(side_effect):
    generate = AsyncMock(side_effect=side_effect)
    client = SimpleNamespace(generate_structured=generate)
    with patch(
        "utils.llm_calls.generate_slide_content.LLMClient",
        return_value=client,
    ), patch(
        "utils.llm_calls.generate_slide_content.get_model",
        return_value="gpt-5-mini",
    ), patch(
        "utils.llm_calls.generate_slide_content.asyncio.sleep",
        new=AsyncMock(),
    ) as sleep:
        try:
            result = asyncio.run(
                get_slide_content_from_type_and_outline(
                    LAYOUT,
                    OUTLINE,
                    "English",
                )
            )
            error = None
        except HTTPException as exc:
            result = None
            error = exc
    return result, error, generate, sleep


def test_budget_exceeded_is_terminal_and_sanitized():
    result, error, generate, sleep = _run_with_side_effect(
        ProviderError(
            429,
            {
                "type": "budget_exceeded",
                "message": "ExceededBudget: User=secret-account over budget",
            },
        )
    )

    assert result is None
    assert error.status_code == 429
    assert error.detail["code"] == "llm_budget_exceeded"
    assert error.detail["detail"] == "The active text model has exhausted its provider budget."
    assert error.detail["retryable"] is False
    assert error.detail["model"] == "gpt-5-mini"
    assert error.detail["action"] == "top_up_or_change_model"
    assert "secret-account" not in str(error.detail)
    assert generate.await_count == 1
    sleep.assert_not_awaited()


def test_background_job_error_is_consumed_after_status_handling():
    with patch("api.v1.ppt.endpoints.presentation.logger.error") as log_error:
        asyncio.run(
            _run_background_job_safely(
                _raise_background_error(),
                job_name="test",
                presentation_id=uuid4(),
            )
        )
    log_error.assert_called_once()
    assert "background job failed" in log_error.call_args.args[0]
    assert log_error.call_args.args[-2:] == ("generation_failed", 500)


def test_generic_rate_limit_retries_and_honors_retry_after():
    result, error, generate, sleep = _run_with_side_effect(
        [
            ProviderError(
                429,
                {"type": "rate_limit", "message": "busy"},
                {"Retry-After": "2"},
            ),
            {"title": "Generated"},
        ]
    )

    assert error is None
    assert result["title"] == "Generated"
    assert generate.await_count == 2
    sleep.assert_awaited_once_with(2.0)


@pytest.mark.parametrize("status_code", [400, 401, 422])
def test_terminal_provider_errors_are_not_retried(status_code):
    _, error, generate, sleep = _run_with_side_effect(
        ProviderError(status_code, {"message": "invalid"})
    )

    assert error.status_code == status_code
    assert generate.await_count == 1
    sleep.assert_not_awaited()


@pytest.mark.parametrize("status_code", [408, 503])
def test_transient_provider_errors_retry_up_to_three_attempts(status_code):
    result, error, generate, sleep = _run_with_side_effect(
        [
            ProviderError(status_code, {"message": "unavailable"}),
            ProviderError(status_code, {"message": "still unavailable"}),
            {"title": "Generated"},
        ]
    )

    assert error is None
    assert result["title"] == "Generated"
    assert generate.await_count == 3
    assert [call.args[0] for call in sleep.await_args_list] == [1, 2]


def test_server_error_is_classified_as_retryable():
    failure = classify_llm_exception(
        ProviderError(503, {"message": "unavailable"}),
        provider="custom",
        model="gpt-5-mini",
    )
    assert failure.code == "llm_unavailable"
    assert failure.retryable is True
