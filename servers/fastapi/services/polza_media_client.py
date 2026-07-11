import asyncio
import time
from typing import Any

import aiohttp


POLZA_DEFAULT_BASE_URL = "https://polza.ai/api/v1"
TRANSIENT_STATUSES = {408, 429, 500, 502, 503, 504}


class PolzaMediaError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None):
        super().__init__(message)
        self.status = status


class PolzaMediaClient:
    _catalog_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
    _cache_ttl_seconds = 900

    def __init__(self, api_key: str, base_url: str | None = None):
        if not api_key:
            raise ValueError("IMAGE_GEN_API_KEY is required for Polza provider")
        self.api_key = api_key
        self.base_url = (base_url or POLZA_DEFAULT_BASE_URL).rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def _json_request(
        self,
        method: str,
        url: str,
        *,
        payload: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        attempts: int = 3,
        timeout_seconds: int = 120,
    ) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(attempts):
            try:
                async with aiohttp.ClientSession(trust_env=True) as session:
                    response = await session.request(
                        method,
                        url,
                        json=payload,
                        params=params,
                        headers=self.headers,
                        timeout=aiohttp.ClientTimeout(total=timeout_seconds),
                    )
                    raw = await response.text()
                    if response.status >= 400:
                        error = PolzaMediaError(
                            f"Polza request failed ({response.status}): {raw[:800]}",
                            status=response.status,
                        )
                        if response.status not in TRANSIENT_STATUSES:
                            raise error
                        last_error = error
                    else:
                        try:
                            data = await response.json(content_type=None)
                        except Exception as exc:
                            raise PolzaMediaError(
                                f"Polza returned invalid JSON: {raw[:500]}"
                            ) from exc
                        if not isinstance(data, dict):
                            raise PolzaMediaError("Polza returned an unexpected payload")
                        return data
            except PolzaMediaError as exc:
                if exc.status not in TRANSIENT_STATUSES:
                    raise
                last_error = exc
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                last_error = exc

            if attempt + 1 < attempts:
                await asyncio.sleep(2**attempt)

        raise PolzaMediaError(f"Polza request failed after {attempts} attempts: {last_error}")

    @staticmethod
    def _is_text_to_image(model: dict[str, Any]) -> bool:
        architecture = model.get("architecture") or {}
        inputs = architecture.get("input_modalities") or []
        outputs = architecture.get("output_modalities") or []
        parameters = model.get("parameters") or (model.get("top_provider") or {}).get("parameters") or {}
        images = parameters.get("images") or {}
        images_required = bool(images.get("required"))
        return "text" in inputs and "image" in outputs and not images_required

    @classmethod
    def normalize_model(cls, model: dict[str, Any]) -> dict[str, Any]:
        parameters = model.get("parameters") or (model.get("top_provider") or {}).get("parameters") or {}
        return {
            "id": str(model.get("id") or ""),
            "name": str(model.get("name") or model.get("id") or ""),
            "type": model.get("type"),
            "endpoints": model.get("endpoints") or [],
            "parameters": parameters,
            "compatible": cls._is_text_to_image(model),
        }

    async def list_image_models(self, *, force: bool = False) -> list[dict[str, Any]]:
        cache_key = self.base_url
        cached = self._catalog_cache.get(cache_key)
        if not force and cached and time.monotonic() - cached[0] < self._cache_ttl_seconds:
            return cached[1]

        payload = await self._json_request(
            "GET",
            f"{self.base_url}/models",
            params={"type": "image", "include_providers": "true"},
            attempts=2,
            timeout_seconds=60,
        )
        models = [
            self.normalize_model(model)
            for model in payload.get("data", [])
            if isinstance(model, dict) and model.get("type") == "image"
        ]
        models = [model for model in models if model["id"]]
        self._catalog_cache[cache_key] = (time.monotonic(), models)
        return models

    @staticmethod
    def _default_parameter_value(name: str, schema: dict[str, Any]) -> Any:
        default = schema.get("default")
        if default not in (None, {}, ""):
            return default
        values = schema.get("values")
        if name == "aspect_ratio" and isinstance(values, list) and "1:1" in values:
            return "1:1"
        if schema.get("required") and isinstance(values, list) and values:
            return values[0]
        return None

    @classmethod
    def build_input(
        cls,
        prompt: str,
        model: dict[str, Any],
        options: dict[str, Any] | None = None,
        images: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        parameter_schema = model.get("parameters") or {}
        result: dict[str, Any] = {"prompt": prompt}
        configured = options or {}
        for name, schema in parameter_schema.items():
            if name in {"prompt", "images", "videos"} or not isinstance(schema, dict):
                continue
            value = configured.get(name)
            allowed_values = schema.get("values")
            if value is not None and isinstance(allowed_values, list) and allowed_values:
                if value not in allowed_values:
                    value = None
            if value is None:
                value = cls._default_parameter_value(name, schema)
            if value is not None:
                result[name] = value
        if images and "images" in parameter_schema:
            result["images"] = images
        return result

    async def generate(
        self,
        *,
        model_id: str,
        prompt: str,
        options: dict[str, Any] | None = None,
        images: list[dict[str, str]] | None = None,
        poll_interval: float = 3,
        max_wait: float = 300,
    ) -> dict[str, Any]:
        models = await self.list_image_models()
        model = next((item for item in models if item["id"] == model_id), None)
        if not model:
            raise PolzaMediaError(f"Polza image model is unavailable: {model_id}")
        if not model.get("compatible") and not images:
            raise PolzaMediaError(
                f"Polza model requires a reference image and cannot generate this slide: {model_id}"
            )

        payload = {
            "model": model_id,
            "input": self.build_input(prompt, model, options, images),
            "async": True,
        }
        status = await self._json_request(
            "POST", f"{self.base_url}/media", payload=payload, timeout_seconds=180
        )
        started = time.monotonic()
        while status.get("status") in {"pending", "processing"}:
            media_id = status.get("id")
            if not media_id:
                raise PolzaMediaError("Polza returned pending status without a media id")
            if time.monotonic() - started >= max_wait:
                raise PolzaMediaError("Polza image generation timed out")
            await asyncio.sleep(poll_interval)
            status = await self._json_request(
                "GET",
                f"{self.base_url}/media/{media_id}",
                attempts=2,
                timeout_seconds=60,
            )

        if status.get("status") != "completed":
            raise PolzaMediaError(
                f"Polza image generation {status.get('status') or 'failed'}: "
                f"{status.get('error') or 'unknown error'}"
            )
        return status

    @staticmethod
    def result_url(status: dict[str, Any]) -> str:
        data = status.get("data")
        if isinstance(data, dict) and isinstance(data.get("url"), str):
            return data["url"]
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and isinstance(item.get("url"), str):
                    return item["url"]
        raise PolzaMediaError("Polza completed without an image URL")
