import json

from utils.user_config import get_user_config


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
