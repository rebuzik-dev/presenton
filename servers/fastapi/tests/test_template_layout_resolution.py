import asyncio
from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest

from templates import get_layout_by_name as layout_module
from templates.get_layout_by_name import (
    _build_template_api_url,
    get_layout_by_name,
)
from utils import get_layout_by_name as api_layout_module


def test_build_template_api_url_uses_nextjs_api_url(monkeypatch):
    monkeypatch.setenv("NEXTJS_API_URL", "http://frontend:3000/")

    assert _build_template_api_url("general") == "http://frontend:3000/api/template?group=general"


def test_builtin_template_exists_supports_legacy_template_root():
    assert layout_module._builtin_template_exists("catering")
    assert api_layout_module._builtin_template_exists("catering")


def test_unknown_builtin_template_fails_before_runtime_fallback(monkeypatch):
    async def fail_extract_schema(url):
        raise AssertionError("unknown built-in template must not call export runtime")

    async def fail_fallback(layout_name):
        raise AssertionError("unknown built-in template must not call Next.js fallback")

    monkeypatch.setattr(
        layout_module.EXPORT_TASK_SERVICE,
        "extract_schema",
        AsyncMock(side_effect=fail_extract_schema),
    )
    monkeypatch.setattr(layout_module, "_fetch_template_fallback_payload", fail_fallback)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_layout_by_name("missing-template"))

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Template with slug 'missing-template' not found"


def test_api_layout_url_uses_nextjs_api_url(monkeypatch):
    monkeypatch.setenv("NEXTJS_API_URL", "http://frontend:3000/")

    assert (
        api_layout_module._build_template_api_url(
            "general",
            auth_token="token",
            api_key="key",
        )
        == "http://frontend:3000/api/template?group=general&token=token&api_key=key"
    )


def test_api_unknown_builtin_template_fails_before_nextjs(monkeypatch):
    async def fail_fetch(*args, **kwargs):
        raise AssertionError("unknown built-in template must not call Next.js")

    monkeypatch.setattr(
        api_layout_module.template_service,
        "get_by_slug",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(api_layout_module, "_fetch_layout_from_nextjs", fail_fetch)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(api_layout_module.get_layout_by_name("missing-template"))

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Template with slug 'missing-template' not found"
