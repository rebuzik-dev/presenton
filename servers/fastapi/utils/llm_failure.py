from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Mapping

from fastapi import HTTPException

from utils.get_env import get_llm_provider_env


@dataclass(frozen=True)
class LLMFailure:
    code: str
    detail: str
    http_status: int
    retryable: bool
    provider: str
    model: str
    action: str
    retry_after_seconds: float | None = None

    def status_payload(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "detail": self.detail,
            "http_status": self.http_status,
            "retryable": self.retryable,
            "provider": self.provider,
            "model": self.model,
            "action": self.action,
        }


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _status_code(exc: BaseException) -> int | None:
    value = getattr(exc, "status_code", None)
    if isinstance(value, int):
        return value
    response = getattr(exc, "response", None)
    value = getattr(response, "status_code", None)
    return value if isinstance(value, int) else None


def _error_body(exc: BaseException) -> Mapping[str, Any]:
    if isinstance(exc, HTTPException):
        detail = exc.detail
        if isinstance(detail, Mapping):
            return detail
    body = _mapping(getattr(exc, "body", None))
    error = _mapping(body.get("error"))
    return error or body


def _retry_after(exc: BaseException) -> float | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    value = headers.get("retry-after") or headers.get("Retry-After")
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        return None
    return min(max(seconds, 0.0), 30.0)


def classify_llm_exception(
    exc: BaseException,
    *,
    provider: str | None = None,
    model: str | None = None,
) -> LLMFailure:
    provider_name = provider or get_llm_provider_env() or "unknown"
    model_name = model or "unknown"
    body = _error_body(exc)
    existing_code = body.get("code")
    if isinstance(existing_code, str) and existing_code.startswith("llm_"):
        return LLMFailure(
            code=existing_code,
            detail=str(body.get("detail") or "The text model request failed."),
            http_status=int(body.get("http_status") or _status_code(exc) or 500),
            retryable=bool(body.get("retryable")),
            provider=str(body.get("provider") or provider_name),
            model=str(body.get("model") or model_name),
            action=str(body.get("action") or "check_provider"),
            retry_after_seconds=_retry_after(exc),
        )

    status = _status_code(exc)
    raw_code = str(body.get("code") or "").lower()
    raw_type = str(body.get("type") or "").lower()
    raw_message = str(body.get("message") or exc).lower()
    is_budget = (
        raw_code == "budget_exceeded"
        or raw_type == "budget_exceeded"
        or "exceededbudget" in raw_message
        or "over budget" in raw_message
    )
    if is_budget:
        return LLMFailure(
            code="llm_budget_exceeded",
            detail="The active text model has exhausted its provider budget.",
            http_status=429,
            retryable=False,
            provider=provider_name,
            model=model_name,
            action="top_up_or_change_model",
        )
    if status in {401, 403}:
        return LLMFailure(
            code="llm_auth_failed",
            detail="The text model provider rejected the configured credentials.",
            http_status=status,
            retryable=False,
            provider=provider_name,
            model=model_name,
            action="check_api_key",
        )
    if status in {400, 422}:
        return LLMFailure(
            code="llm_request_invalid",
            detail="The text model provider rejected the generation request.",
            http_status=status,
            retryable=False,
            provider=provider_name,
            model=model_name,
            action="change_model_or_request",
        )
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return LLMFailure(
            code="llm_timeout",
            detail="The text model request timed out.",
            http_status=504,
            retryable=True,
            provider=provider_name,
            model=model_name,
            action="retry_later",
        )
    if status == 429:
        return LLMFailure(
            code="llm_rate_limited",
            detail="The text model provider is temporarily rate limiting requests.",
            http_status=429,
            retryable=True,
            provider=provider_name,
            model=model_name,
            action="retry_later",
            retry_after_seconds=_retry_after(exc),
        )
    if status == 408 or (status is not None and status >= 500):
        return LLMFailure(
            code="llm_unavailable",
            detail="The text model provider is temporarily unavailable.",
            http_status=status or 503,
            retryable=True,
            provider=provider_name,
            model=model_name,
            action="retry_later",
        )
    return LLMFailure(
        code="llm_unknown",
        detail="The text model request failed.",
        http_status=status or 500,
        retryable=False,
        provider=provider_name,
        model=model_name,
        action="check_provider",
    )


def status_error_from_exception(exc: BaseException) -> dict[str, Any]:
    if isinstance(exc, HTTPException):
        if isinstance(exc.detail, Mapping) and str(exc.detail.get("code") or "").startswith("llm_"):
            return classify_llm_exception(exc).status_payload()
        return {
            "code": "generation_failed",
            "detail": "Presentation generation failed.",
            "http_status": exc.status_code,
            "retryable": False,
            "provider": "presenton",
            "model": "none",
            "action": "check_request",
        }
    return {
        "code": "generation_failed",
        "detail": "Presentation generation failed.",
        "http_status": 500,
        "retryable": False,
        "provider": "presenton",
        "model": "none",
        "action": "retry_or_contact_support",
    }


def http_exception_from_failure(failure: LLMFailure) -> HTTPException:
    return HTTPException(status_code=failure.http_status, detail=failure.status_payload())
