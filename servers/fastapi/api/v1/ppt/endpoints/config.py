import asyncio

from fastapi import APIRouter, HTTPException

from models.user_config import UserConfig
from utils.get_env import get_user_config_path_env
from utils.llm_provider_profiles import resolve_active_model_profile
from utils.user_config import get_user_config, update_env_with_user_config
from utils.user_config_store import read_user_config_file


CONFIG_ROUTER = APIRouter(prefix="/config", tags=["config"])
_apply_lock = asyncio.Lock()


@CONFIG_ROUTER.post("/apply")
async def apply_saved_configuration():
    async with _apply_lock:
        try:
            config_path = get_user_config_path_env()
            if not config_path:
                raise ValueError("USER_CONFIG_PATH is not configured")
            saved_config = resolve_active_model_profile(
                UserConfig(**read_user_config_file(config_path))
            )
            saved_profiles = saved_config.LLM_MODEL_PROFILES or []
            if saved_profiles and not any(
                profile.id == saved_config.ACTIVE_LLM_MODEL_PROFILE_ID
                for profile in saved_profiles
            ):
                raise ValueError("Active text model profile is invalid")
            if not saved_config.DISABLE_IMAGE_GENERATION and not saved_config.IMAGE_PROVIDER:
                raise ValueError("Image provider is not configured")
            await asyncio.to_thread(update_env_with_user_config, saved_config)
            config = await asyncio.to_thread(get_user_config)
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Unable to apply saved configuration: {exc}",
            ) from exc

    profiles = config.LLM_MODEL_PROFILES or []
    active_profile = next(
        (
            profile
            for profile in profiles
            if profile.id == config.ACTIVE_LLM_MODEL_PROFILE_ID
        ),
        None,
    )
    if profiles and active_profile is None:
        raise HTTPException(status_code=422, detail="Active text model profile is invalid")
    if not config.DISABLE_IMAGE_GENERATION and not config.IMAGE_PROVIDER:
        raise HTTPException(status_code=422, detail="Image provider is not configured")

    return {
        "text": {
            "profile_id": active_profile.id if active_profile else None,
            "provider": config.LLM,
            "model": active_profile.model_id if active_profile else None,
        },
        "image": {
            "provider": "disabled" if config.DISABLE_IMAGE_GENERATION else config.IMAGE_PROVIDER,
            "model": config.IMAGE_GEN_MODEL,
        },
    }
