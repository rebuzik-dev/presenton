from urllib.parse import urlparse

from enums.image_provider import ImageProvider
from utils.get_env import (
    get_disable_image_generation_env,
    get_image_provider_env,
    get_image_gen_base_url_env,
)
from utils.parsers import parse_bool_or_none


def is_image_generation_disabled() -> bool:
    return parse_bool_or_none(get_disable_image_generation_env()) or False


def is_pixels_selected() -> bool:
    return ImageProvider.PEXELS == get_selected_image_provider()


def is_pixabay_selected() -> bool:
    return ImageProvider.PIXABAY == get_selected_image_provider()


def is_openai_compatible_selected() -> bool:
    return ImageProvider.OPENAI_COMPATIBLE == get_selected_image_provider()


def is_gemini_flash_selected() -> bool:
    return ImageProvider.GEMINI_FLASH == get_selected_image_provider()


def is_nanobanana_pro_selected() -> bool:
    return ImageProvider.NANOBANANA_PRO == get_selected_image_provider()


def is_dalle3_selected() -> bool:
    return ImageProvider.DALLE3 == get_selected_image_provider()


def is_gpt_image_1_5_selected() -> bool:
    return ImageProvider.GPT_IMAGE_1_5 == get_selected_image_provider()


def is_comfyui_selected() -> bool:
    return ImageProvider.COMFYUI == get_selected_image_provider()


def is_open_webui_selected() -> bool:
    return ImageProvider.OPEN_WEBUI == get_selected_image_provider()


def is_polza_selected() -> bool:
    return ImageProvider.POLZA == get_selected_image_provider()


def is_custom_openai_selected() -> bool:
    return ImageProvider.CUSTOM_OPENAI == get_selected_image_provider()


def is_vsellm_selected() -> bool:
    return ImageProvider.VSELLM == get_selected_image_provider()


def get_selected_image_provider() -> ImageProvider | None:
    """
    Get the selected image provider from environment variables.
    Returns:
        ImageProvider: The selected image provider.
    """
    image_provider_env = get_image_provider_env()
    if image_provider_env:
        return ImageProvider(
            normalize_legacy_polza_provider(
                image_provider_env,
                get_image_gen_base_url_env(),
            )
        )
    return None


def normalize_legacy_polza_provider(
    provider: str | None,
    base_url: str | None,
) -> str | None:
    if provider != ImageProvider.CUSTOM_OPENAI.value or not base_url:
        return provider
    try:
        hostname = (urlparse(base_url).hostname or "").lower()
    except ValueError:
        return provider
    if hostname == "polza.ai" or hostname.endswith(".polza.ai"):
        return ImageProvider.POLZA.value
    return provider
