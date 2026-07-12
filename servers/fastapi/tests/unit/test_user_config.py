import json

from models.user_config import LLMModelProfile, LLMProviderConnection, UserConfig
from utils.user_config import get_user_config, update_env_with_user_config


def test_env_values_override_persisted_user_config(tmp_path, monkeypatch):
    config_path = tmp_path / "userConfig.json"
    config_path.write_text(
        json.dumps(
            {
                "LLM": "openai",
                "OPENAI_MODEL": "",
                "IMAGE_PROVIDER": "gpt-image-1.5",
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("USER_CONFIG_PATH", str(config_path))
    monkeypatch.setenv("LLM", "custom")
    monkeypatch.setenv("CUSTOM_LLM_URL", "https://api.vsellm.ru/v1")
    monkeypatch.setenv("CUSTOM_MODEL", "gpt-5-mini")
    monkeypatch.setenv("IMAGE_PROVIDER", "custom_openai")

    config = get_user_config()

    assert config.LLM == "custom"
    assert config.CUSTOM_LLM_URL == "https://api.vsellm.ru/v1"
    assert config.CUSTOM_MODEL == "gpt-5-mini"
    assert config.IMAGE_PROVIDER == "custom_openai"


def test_explicit_saved_config_applies_global_text_and_polza_models(monkeypatch):
    config = UserConfig(
        LLM_PROVIDER_CONNECTIONS=[
            LLMProviderConnection(
                id="conn_polza_text",
                name="Polza text",
                provider_type="openai_compatible",
                base_url="https://polza.ai/api/v1",
                api_key="text-secret",
            )
        ],
        LLM_MODEL_PROFILES=[
            LLMModelProfile(
                id="profile_text",
                name="Global text",
                provider_connection_id="conn_polza_text",
                model_id="openai/gpt-5-mini",
                is_default=True,
            )
        ],
        ACTIVE_LLM_MODEL_PROFILE_ID="profile_text",
        IMAGE_PROVIDER="polza",
        IMAGE_GEN_API_KEY="image-secret",
        IMAGE_GEN_BASE_URL="https://polza.ai/api/v1",
        IMAGE_GEN_MODEL="google/gemini-3.1-flash-lite-image",
        POLZA_IMAGE_OPTIONS={"aspect_ratio": "16:9", "max_images": 1},
    )

    update_env_with_user_config(config)

    assert __import__("os").environ["LLM"] == "custom"
    assert __import__("os").environ["CUSTOM_MODEL"] == "openai/gpt-5-mini"
    assert __import__("os").environ["IMAGE_PROVIDER"] == "polza"
    assert __import__("os").environ["IMAGE_GEN_MODEL"] == "google/gemini-3.1-flash-lite-image"
    assert json.loads(__import__("os").environ["POLZA_IMAGE_OPTIONS"])["aspect_ratio"] == "16:9"
