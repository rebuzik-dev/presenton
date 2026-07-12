from unittest.mock import patch

from services.image_generation_service import ImageGenerationService
from utils.image_provider import normalize_legacy_polza_provider


def test_legacy_polza_host_is_normalized_without_substring_matches():
    assert (
        normalize_legacy_polza_provider(
            "custom_openai", "https://polza.ai/api/v1"
        )
        == "polza"
    )
    assert (
        normalize_legacy_polza_provider(
            "custom_openai", "https://media.polza.ai/api/v1"
        )
        == "polza"
    )
    assert (
        normalize_legacy_polza_provider(
            "custom_openai", "https://polza.ai.attacker.example/v1"
        )
        == "custom_openai"
    )


def test_legacy_polza_selects_media_transport(tmp_path):
    with patch.dict(
        "os.environ",
        {
            "IMAGE_PROVIDER": "custom_openai",
            "IMAGE_GEN_BASE_URL": "https://polza.ai/api/v1",
            "DISABLE_IMAGE_GENERATION": "false",
        },
        clear=False,
    ):
        service = ImageGenerationService(str(tmp_path))
    assert service.image_gen_func == service.generate_image_polza
