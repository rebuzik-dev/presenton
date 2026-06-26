from models.user_config import UserConfig


def _compact_id(value: str) -> str:
    compacted = "".join(char.lower() if char.isalnum() else "_" for char in value)
    compacted = "_".join(part for part in compacted.split("_") if part)
    return compacted[:48] or "default"


def _is_non_empty(value: str | None) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _legacy_provider(provider_type: str | None) -> str:
    if provider_type == "openai_compatible":
        return "custom"
    return provider_type or "openai"


def _key_field(provider_type: str | None) -> str | None:
    match _legacy_provider(provider_type):
        case "openai":
            return "OPENAI_API_KEY"
        case "google":
            return "GOOGLE_API_KEY"
        case "anthropic":
            return "ANTHROPIC_API_KEY"
        case "openrouter":
            return "OPENROUTER_API_KEY"
        case "fireworks":
            return "FIREWORKS_API_KEY"
        case "together":
            return "TOGETHER_API_KEY"
        case "cerebras":
            return "CEREBRAS_API_KEY"
        case "litellm":
            return "LITELLM_API_KEY"
        case "lmstudio":
            return "LMSTUDIO_API_KEY"
        case "custom":
            return "CUSTOM_LLM_API_KEY"
    return None


def _model_field(provider_type: str | None) -> str | None:
    match _legacy_provider(provider_type):
        case "openai":
            return "OPENAI_MODEL"
        case "google":
            return "GOOGLE_MODEL"
        case "anthropic":
            return "ANTHROPIC_MODEL"
        case "openrouter":
            return "OPENROUTER_MODEL"
        case "fireworks":
            return "FIREWORKS_MODEL"
        case "together":
            return "TOGETHER_MODEL"
        case "cerebras":
            return "CEREBRAS_MODEL"
        case "litellm":
            return "LITELLM_MODEL"
        case "lmstudio":
            return "LMSTUDIO_MODEL"
        case "ollama":
            return "OLLAMA_MODEL"
        case "custom":
            return "CUSTOM_MODEL"
    return None


def _base_url_field(provider_type: str | None) -> str | None:
    match _legacy_provider(provider_type):
        case "openrouter":
            return "OPENROUTER_BASE_URL"
        case "fireworks":
            return "FIREWORKS_BASE_URL"
        case "together":
            return "TOGETHER_BASE_URL"
        case "cerebras":
            return "CEREBRAS_BASE_URL"
        case "litellm":
            return "LITELLM_BASE_URL"
        case "lmstudio":
            return "LMSTUDIO_BASE_URL"
        case "ollama":
            return "OLLAMA_URL"
        case "custom":
            return "CUSTOM_LLM_URL"
    return None


def _provider_type(provider: str | None) -> str:
    if provider == "custom":
        return "openai_compatible"
    return provider or "openai"


def _provider_label(provider_type: str) -> str:
    match provider_type:
        case "openai_compatible":
            return "Custom OpenAI-compatible"
        case "openrouter":
            return "OpenRouter"
        case "litellm":
            return "LiteLLM"
        case "lmstudio":
            return "LM Studio"
    return provider_type[:1].upper() + provider_type[1:]


def migrate_legacy_model_profiles(config: UserConfig) -> UserConfig:
    has_connections = config.LLM_PROVIDER_CONNECTIONS is not None
    has_profiles = config.LLM_MODEL_PROFILES is not None
    if has_connections or has_profiles:
        values = config.model_dump()
        values["LLM_PROVIDER_CONNECTIONS"] = config.LLM_PROVIDER_CONNECTIONS or []
        values["LLM_MODEL_PROFILES"] = config.LLM_MODEL_PROFILES or []
        return UserConfig(**values)

    legacy_provider = config.LLM or "openai"
    if legacy_provider in {"codex", "chatgpt"}:
        values = config.model_dump()
        values["LLM_PROVIDER_CONNECTIONS"] = []
        values["LLM_MODEL_PROFILES"] = []
        return UserConfig(**values)

    provider_type = _provider_type(legacy_provider)
    key_field = _key_field(provider_type)
    model_field = _model_field(provider_type)
    base_url_field = _base_url_field(provider_type)
    api_key = getattr(config, key_field, None) if key_field else None
    model_id = getattr(config, model_field, None) if model_field else None
    base_url = getattr(config, base_url_field, None) if base_url_field else None

    if not _is_non_empty(api_key) and not _is_non_empty(model_id) and not _is_non_empty(base_url):
        values = config.model_dump()
        values["LLM_PROVIDER_CONNECTIONS"] = []
        values["LLM_MODEL_PROFILES"] = []
        return UserConfig(**values)

    from models.user_config import LLMModelProfile, LLMProviderConnection

    suffix = _compact_id(f"{provider_type}_{base_url or model_id or 'default'}")
    connection_id = f"conn_{suffix}"
    profile_id = f"model_{suffix}"
    connection = LLMProviderConnection(
        id=connection_id,
        name=_provider_label(provider_type),
        provider_type=provider_type,
        base_url=base_url or "",
        api_key=api_key or "",
        models_cache=[model_id] if _is_non_empty(model_id) else [],
        is_active=True,
    )
    profile = LLMModelProfile(
        id=profile_id,
        name=model_id or f"{connection.name} model",
        provider_connection_id=connection_id,
        model_id=model_id or "",
        purpose="default",
        is_default=True,
        is_active=True,
    )

    values = config.model_dump()
    values["LLM_PROVIDER_CONNECTIONS"] = [connection]
    values["LLM_MODEL_PROFILES"] = [profile]
    values["ACTIVE_LLM_MODEL_PROFILE_ID"] = profile_id
    return UserConfig(**values)


def resolve_active_model_profile(config: UserConfig) -> UserConfig:
    config = migrate_legacy_model_profiles(config)
    profiles = config.LLM_MODEL_PROFILES or []
    connections = config.LLM_PROVIDER_CONNECTIONS or []
    if not profiles or not connections:
        return config

    active_profile = next(
        (profile for profile in profiles if profile.id == config.ACTIVE_LLM_MODEL_PROFILE_ID),
        None,
    )
    if active_profile is None:
        active_profile = next(
            (
                profile
                for profile in profiles
                if profile.is_default and profile.is_active is not False
            ),
            None,
        )
    if active_profile is None:
        active_profile = next(
            (profile for profile in profiles if profile.is_active is not False),
            None,
        )
    if active_profile is None:
        return config

    connection = next(
        (
            item
            for item in connections
            if item.id == active_profile.provider_connection_id
            and item.is_active is not False
        ),
        None,
    )
    if connection is None:
        return config

    values = config.model_dump()
    values["LLM"] = _legacy_provider(connection.provider_type)

    key_field = _key_field(connection.provider_type)
    model_field = _model_field(connection.provider_type)
    base_url_field = _base_url_field(connection.provider_type)

    if key_field and connection.api_key:
        values[key_field] = connection.api_key
    if model_field and active_profile.model_id:
        values[model_field] = active_profile.model_id
    if base_url_field and connection.base_url:
        values[base_url_field] = connection.base_url

    return UserConfig(**values)
