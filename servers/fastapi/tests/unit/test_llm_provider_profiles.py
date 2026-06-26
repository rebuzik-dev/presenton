from models.user_config import LLMModelProfile, LLMProviderConnection, UserConfig
from utils.llm_provider_profiles import (
    migrate_legacy_model_profiles,
    resolve_active_model_profile,
)


def test_legacy_custom_config_migrates_to_provider_connection_and_profile():
    config = UserConfig(
        LLM="custom",
        CUSTOM_LLM_URL="https://api.vsellm.ru/v1",
        CUSTOM_LLM_API_KEY="legacy-secret",
        CUSTOM_MODEL="openai/gpt-5.4",
    )

    migrated = migrate_legacy_model_profiles(config)

    assert migrated.CUSTOM_LLM_API_KEY == "legacy-secret"
    assert migrated.LLM_PROVIDER_CONNECTIONS is not None
    assert migrated.LLM_MODEL_PROFILES is not None
    assert len(migrated.LLM_PROVIDER_CONNECTIONS) == 1
    assert len(migrated.LLM_MODEL_PROFILES) == 1
    connection = migrated.LLM_PROVIDER_CONNECTIONS[0]
    profile = migrated.LLM_MODEL_PROFILES[0]
    assert connection.provider_type == "openai_compatible"
    assert connection.base_url == "https://api.vsellm.ru/v1"
    assert connection.api_key == "legacy-secret"
    assert connection.models_cache == ["openai/gpt-5.4"]
    assert profile.provider_connection_id == connection.id
    assert profile.model_id == "openai/gpt-5.4"
    assert migrated.ACTIVE_LLM_MODEL_PROFILE_ID == profile.id


def test_existing_provider_connections_are_not_remigrated_or_overwritten():
    connection = LLMProviderConnection(
        id="conn_existing",
        name="Existing",
        provider_type="openai",
        api_key="stored-secret",
    )
    profile = LLMModelProfile(
        id="model_existing",
        name="Existing model",
        provider_connection_id="conn_existing",
        model_id="gpt-4.1",
    )
    config = UserConfig(
        LLM="custom",
        CUSTOM_LLM_API_KEY="legacy-secret",
        LLM_PROVIDER_CONNECTIONS=[connection],
        LLM_MODEL_PROFILES=[profile],
    )

    migrated = migrate_legacy_model_profiles(config)

    assert migrated.LLM_PROVIDER_CONNECTIONS == [connection]
    assert migrated.LLM_MODEL_PROFILES == [profile]
    assert migrated.CUSTOM_LLM_API_KEY == "legacy-secret"


def test_active_openai_compatible_profile_resolves_to_custom_legacy_fields():
    config = UserConfig(
        LLM="openai",
        CUSTOM_LLM_URL="https://old.example/v1",
        CUSTOM_LLM_API_KEY="old-key",
        CUSTOM_MODEL="old-model",
        LLM_PROVIDER_CONNECTIONS=[
            LLMProviderConnection(
                id="conn_vsellm",
                name="vseLLM",
                provider_type="openai_compatible",
                base_url="https://api.vsellm.ru/v1",
                api_key="secret-key",
            )
        ],
        LLM_MODEL_PROFILES=[
            LLMModelProfile(
                id="model_vsellm",
                name="vseLLM model",
                provider_connection_id="conn_vsellm",
                model_id="openai/gpt-5.4",
                is_default=True,
            )
        ],
        ACTIVE_LLM_MODEL_PROFILE_ID="model_vsellm",
    )

    resolved = resolve_active_model_profile(config)

    assert resolved.LLM == "custom"
    assert resolved.CUSTOM_LLM_URL == "https://api.vsellm.ru/v1"
    assert resolved.CUSTOM_LLM_API_KEY == "secret-key"
    assert resolved.CUSTOM_MODEL == "openai/gpt-5.4"
    assert resolved.LLM_MODEL_PROFILES[0].model_id == "openai/gpt-5.4"


def test_model_profile_does_not_need_or_store_api_key():
    profile = LLMModelProfile(
        id="model_openai",
        name="OpenAI model",
        provider_connection_id="conn_openai",
        model_id="gpt-4.1",
        is_default=True,
    )

    assert "api_key" not in profile.model_dump()


def test_missing_active_profile_falls_back_to_existing_legacy_config():
    config = UserConfig(
        LLM="openai",
        OPENAI_API_KEY="legacy-key",
        OPENAI_MODEL="gpt-4.1",
        LLM_PROVIDER_CONNECTIONS=[
            LLMProviderConnection(
                id="conn_other",
                name="Other",
                provider_type="anthropic",
                api_key="anthropic-key",
            )
        ],
        LLM_MODEL_PROFILES=[],
        ACTIVE_LLM_MODEL_PROFILE_ID="missing",
    )

    resolved = resolve_active_model_profile(config)

    assert resolved.LLM == "openai"
    assert resolved.OPENAI_API_KEY == "legacy-key"
    assert resolved.OPENAI_MODEL == "gpt-4.1"
