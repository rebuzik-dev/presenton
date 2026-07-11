from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.polza_media_client import POLZA_DEFAULT_BASE_URL, PolzaMediaClient
from utils.user_config import get_user_config


IMAGE_PROVIDERS_ROUTER = APIRouter(prefix="/image-providers", tags=["image-providers"])
SECRET_MARKERS = {"", "__configured__"}


class PolzaModelsRequest(BaseModel):
    base_url: str | None = None
    api_key: str | None = None
    force: bool = False


@IMAGE_PROVIDERS_ROUTER.post("/polza/models")
async def get_polza_models(request: PolzaModelsRequest):
    saved = get_user_config()
    api_key = (request.api_key or "").strip()
    if api_key in SECRET_MARKERS:
        api_key = saved.IMAGE_GEN_API_KEY or ""
    if not api_key:
        raise HTTPException(status_code=422, detail="Polza API key is required")

    base_url = (request.base_url or saved.IMAGE_GEN_BASE_URL or POLZA_DEFAULT_BASE_URL).strip()
    try:
        models = await PolzaMediaClient(api_key=api_key, base_url=base_url).list_image_models(
            force=request.force
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "models": models,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
