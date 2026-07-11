import asyncio

import pytest

from services.polza_media_client import PolzaMediaClient, PolzaMediaError


MODEL = {
    "id": "google/gemini-3.1-flash-lite-image",
    "name": "Gemini Flash Lite Image",
    "type": "image",
    "architecture": {
        "input_modalities": ["text"],
        "output_modalities": ["image"],
    },
    "top_provider": {
        "parameters": {
            "prompt": {"required": True},
            "aspect_ratio": {
                "required": True,
                "default": "1:1",
                "values": ["1:1", "16:9"],
            },
            "max_images": {"required": True, "default": 1},
            "output_format": {"values": ["png", "jpg"], "default": "png"},
        }
    },
    "endpoints": ["/v1/media"],
}


def test_catalog_model_uses_provider_parameter_schema():
    normalized = PolzaMediaClient.normalize_model(MODEL)
    assert normalized["compatible"] is True
    assert normalized["parameters"]["aspect_ratio"]["values"] == ["1:1", "16:9"]


def test_build_input_only_sends_supported_valid_parameters():
    normalized = PolzaMediaClient.normalize_model(MODEL)
    payload = PolzaMediaClient.build_input(
        "Космический корабль",
        normalized,
        {
            "aspect_ratio": "4:3",
            "max_images": 2,
            "output_format": "jpg",
            "unsupported": "discard me",
        },
    )
    assert payload == {
        "prompt": "Космический корабль",
        "aspect_ratio": "1:1",
        "max_images": 2,
        "output_format": "jpg",
    }


def test_generate_sends_media_payload_and_polls(monkeypatch):
    client = PolzaMediaClient("secret")
    model = PolzaMediaClient.normalize_model(MODEL)
    monkeypatch.setattr(client, "list_image_models", lambda **_: _async_value([model]))
    calls = []

    async def request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        if method == "POST":
            return {"id": "aig_123", "status": "pending"}
        return {"id": "aig_123", "status": "completed", "data": {"url": "https://cdn/x.png"}}

    monkeypatch.setattr(client, "_json_request", request)
    result = asyncio.run(
        client.generate(
            model_id=MODEL["id"],
            prompt="Космический корабль",
            options={"aspect_ratio": "1:1", "max_images": 1},
            poll_interval=0,
        )
    )

    assert calls[0][0:2] == ("POST", "https://polza.ai/api/v1/media")
    assert calls[0][2]["payload"] == {
        "model": MODEL["id"],
        "input": {
            "prompt": "Космический корабль",
            "aspect_ratio": "1:1",
            "max_images": 1,
            "output_format": "png",
        },
        "async": True,
    }
    assert calls[1][1].endswith("/media/aig_123")
    assert PolzaMediaClient.result_url(result) == "https://cdn/x.png"


def test_generate_reports_cancelled_without_retry(monkeypatch):
    client = PolzaMediaClient("secret")
    model = PolzaMediaClient.normalize_model(MODEL)
    monkeypatch.setattr(client, "list_image_models", lambda **_: _async_value([model]))

    async def request(*args, **kwargs):
        return {"id": "aig_123", "status": "cancelled"}

    monkeypatch.setattr(client, "_json_request", request)
    with pytest.raises(PolzaMediaError, match="cancelled"):
        asyncio.run(client.generate(model_id=MODEL["id"], prompt="test"))


async def _async_value(value):
    return value


class _FakeResponse:
    def __init__(self, status, payload):
        self.status = status
        self.payload = payload

    async def text(self):
        return str(self.payload)

    async def json(self, **kwargs):
        return self.payload


class _FakeSession:
    def __init__(self, responses, calls):
        self.responses = responses
        self.calls = calls

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def request(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return self.responses.pop(0)


def test_http_400_is_not_retried(monkeypatch):
    calls = []
    responses = [_FakeResponse(400, {"error": {"message": "This field is required"}})]
    monkeypatch.setattr(
        "services.polza_media_client.aiohttp.ClientSession",
        lambda **_: _FakeSession(responses, calls),
    )

    with pytest.raises(PolzaMediaError, match="400"):
        asyncio.run(
            PolzaMediaClient("secret")._json_request(
                "POST", "https://polza.ai/api/v1/media", payload={}
            )
        )
    assert len(calls) == 1


def test_http_429_is_retried(monkeypatch):
    calls = []
    responses = [
        _FakeResponse(429, {"error": "busy"}),
        _FakeResponse(200, {"status": "completed"}),
    ]
    monkeypatch.setattr(
        "services.polza_media_client.aiohttp.ClientSession",
        lambda **_: _FakeSession(responses, calls),
    )

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr("services.polza_media_client.asyncio.sleep", no_sleep)
    result = asyncio.run(
        PolzaMediaClient("secret")._json_request(
            "POST", "https://polza.ai/api/v1/media", payload={}
        )
    )
    assert result["status"] == "completed"
    assert len(calls) == 2
