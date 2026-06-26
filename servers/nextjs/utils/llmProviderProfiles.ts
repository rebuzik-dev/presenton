import { LLMConfig, LLMModelProfile, LLMProviderConnection } from "@/types/llm_config";

export const CONFIGURED_SECRET_MARKER = "__configured__";

export const TEXT_PROVIDER_TYPES = [
  "openai",
  "google",
  "anthropic",
  "openai_compatible",
  "openrouter",
  "fireworks",
  "together",
  "cerebras",
  "litellm",
  "lmstudio",
  "ollama",
] as const;

export const MODEL_PROFILE_PURPOSES = ["default", "text", "template"] as const;

export function providerTypeToLegacyProvider(providerType?: string): string {
  return providerType === "openai_compatible" ? "custom" : providerType || "openai";
}

export function legacyProviderToProviderType(provider?: string): string {
  return provider === "custom" ? "openai_compatible" : provider || "openai";
}

export function getProviderKeyField(providerType?: string): keyof LLMConfig | null {
  switch (providerTypeToLegacyProvider(providerType)) {
    case "openai":
      return "OPENAI_API_KEY";
    case "google":
      return "GOOGLE_API_KEY";
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openrouter":
      return "OPENROUTER_API_KEY";
    case "fireworks":
      return "FIREWORKS_API_KEY";
    case "together":
      return "TOGETHER_API_KEY";
    case "cerebras":
      return "CEREBRAS_API_KEY";
    case "litellm":
      return "LITELLM_API_KEY";
    case "lmstudio":
      return "LMSTUDIO_API_KEY";
    case "custom":
      return "CUSTOM_LLM_API_KEY";
    default:
      return null;
  }
}

export function getProviderModelField(providerType?: string): keyof LLMConfig | null {
  switch (providerTypeToLegacyProvider(providerType)) {
    case "openai":
      return "OPENAI_MODEL";
    case "google":
      return "GOOGLE_MODEL";
    case "anthropic":
      return "ANTHROPIC_MODEL";
    case "openrouter":
      return "OPENROUTER_MODEL";
    case "fireworks":
      return "FIREWORKS_MODEL";
    case "together":
      return "TOGETHER_MODEL";
    case "cerebras":
      return "CEREBRAS_MODEL";
    case "litellm":
      return "LITELLM_MODEL";
    case "lmstudio":
      return "LMSTUDIO_MODEL";
    case "ollama":
      return "OLLAMA_MODEL";
    case "custom":
      return "CUSTOM_MODEL";
    default:
      return null;
  }
}

export function getProviderBaseUrlField(providerType?: string): keyof LLMConfig | null {
  switch (providerTypeToLegacyProvider(providerType)) {
    case "openrouter":
      return "OPENROUTER_BASE_URL";
    case "fireworks":
      return "FIREWORKS_BASE_URL";
    case "together":
      return "TOGETHER_BASE_URL";
    case "cerebras":
      return "CEREBRAS_BASE_URL";
    case "litellm":
      return "LITELLM_BASE_URL";
    case "lmstudio":
      return "LMSTUDIO_BASE_URL";
    case "ollama":
      return "OLLAMA_URL";
    case "custom":
      return "CUSTOM_LLM_URL";
    default:
      return null;
  }
}

function compactId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function getLegacyProviderLabel(providerType: string): string {
  switch (providerType) {
    case "openai_compatible":
      return "Custom OpenAI-compatible";
    case "openrouter":
      return "OpenRouter";
    case "litellm":
      return "LiteLLM";
    case "lmstudio":
      return "LM Studio";
    default:
      return providerType.charAt(0).toUpperCase() + providerType.slice(1);
  }
}

export function migrateLegacyLLMConfig(config: LLMConfig): LLMConfig {
  const hasStoredConnections = Array.isArray(config.LLM_PROVIDER_CONNECTIONS);
  const hasStoredProfiles = Array.isArray(config.LLM_MODEL_PROFILES);
  const connections = Array.isArray(config.LLM_PROVIDER_CONNECTIONS)
    ? config.LLM_PROVIDER_CONNECTIONS
    : [];
  const profiles = Array.isArray(config.LLM_MODEL_PROFILES)
    ? config.LLM_MODEL_PROFILES
    : [];

  if (hasStoredConnections || hasStoredProfiles) {
    return { ...config, LLM_PROVIDER_CONNECTIONS: connections, LLM_MODEL_PROFILES: profiles };
  }

  const legacyProvider = config.LLM || "openai";
  if (legacyProvider === "codex" || legacyProvider === "chatgpt") {
    return { ...config, LLM_PROVIDER_CONNECTIONS: [], LLM_MODEL_PROFILES: [] };
  }

  const providerType = legacyProviderToProviderType(legacyProvider);
  const keyField = getProviderKeyField(providerType);
  const modelField = getProviderModelField(providerType);
  const baseUrlField = getProviderBaseUrlField(providerType);
  const apiKey = keyField ? (config[keyField] as string | undefined) : undefined;
  const modelId = modelField ? (config[modelField] as string | undefined) : undefined;
  const baseUrl = baseUrlField ? (config[baseUrlField] as string | undefined) : undefined;

  if (!isNonEmptyString(apiKey) && !isNonEmptyString(modelId) && !isNonEmptyString(baseUrl)) {
    return { ...config, LLM_PROVIDER_CONNECTIONS: [], LLM_MODEL_PROFILES: [] };
  }

  const suffix = compactId(`${providerType}_${baseUrl || modelId || "default"}`) || "default";
  const connectionId = `conn_${suffix}`;
  const profileId = `model_${suffix}`;
  const connection: LLMProviderConnection = {
    id: connectionId,
    name: getLegacyProviderLabel(providerType),
    provider_type: providerType,
    base_url: baseUrl || "",
    api_key: apiKey || "",
    models_cache: modelId ? [modelId] : [],
    is_active: true,
  };
  const profile: LLMModelProfile = {
    id: profileId,
    name: modelId || `${connection.name} model`,
    provider_connection_id: connectionId,
    model_id: modelId || "",
    temperature: undefined,
    max_tokens: undefined,
    purpose: "default",
    is_default: true,
    is_active: true,
  };

  return {
    ...config,
    LLM_PROVIDER_CONNECTIONS: [connection],
    LLM_MODEL_PROFILES: [profile],
    ACTIVE_LLM_MODEL_PROFILE_ID: profileId,
  };
}

export function resolveActiveProfileToLegacyConfig(config: LLMConfig): LLMConfig {
  const migrated = migrateLegacyLLMConfig(config);
  const connections = migrated.LLM_PROVIDER_CONNECTIONS || [];
  const profiles = migrated.LLM_MODEL_PROFILES || [];
  const activeProfile =
    profiles.find((profile) => profile.id === migrated.ACTIVE_LLM_MODEL_PROFILE_ID) ||
    profiles.find((profile) => profile.is_default && profile.is_active !== false) ||
    profiles.find((profile) => profile.is_active !== false);

  if (!activeProfile) {
    return migrated;
  }

  const connection = connections.find(
    (candidate) =>
      candidate.id === activeProfile.provider_connection_id &&
      candidate.is_active !== false
  );
  if (!connection) {
    return migrated;
  }

  const legacyProvider = providerTypeToLegacyProvider(connection.provider_type);
  const nextConfig: LLMConfig = { ...migrated, LLM: legacyProvider };
  const keyField = getProviderKeyField(connection.provider_type);
  const modelField = getProviderModelField(connection.provider_type);
  const baseUrlField = getProviderBaseUrlField(connection.provider_type);

  if (keyField && isNonEmptyString(connection.api_key)) {
    (nextConfig as Record<string, unknown>)[keyField] = connection.api_key;
  }
  if (modelField && isNonEmptyString(activeProfile.model_id)) {
    (nextConfig as Record<string, unknown>)[modelField] = activeProfile.model_id;
  }
  if (baseUrlField && isNonEmptyString(connection.base_url)) {
    (nextConfig as Record<string, unknown>)[baseUrlField] = connection.base_url;
  }

  return nextConfig;
}

export function sanitizeProviderConnectionSecrets(
  connections?: LLMProviderConnection[]
): LLMProviderConnection[] {
  if (!Array.isArray(connections)) return [];
  return connections.map((connection) => ({
    ...connection,
    api_key: connection.api_key ? CONFIGURED_SECRET_MARKER : "",
  }));
}

export function mergeProviderConnectionSecrets(
  incoming?: LLMProviderConnection[],
  existing?: LLMProviderConnection[]
): LLMProviderConnection[] {
  if (!Array.isArray(incoming)) return [];
  const existingById = new Map((existing || []).map((connection) => [connection.id, connection]));
  return incoming.map((connection) => {
    const existingConnection = existingById.get(connection.id);
    const incomingKey = connection.api_key;
    const shouldKeepExistingKey =
      incomingKey === undefined ||
      incomingKey === null ||
      incomingKey === "" ||
      incomingKey === CONFIGURED_SECRET_MARKER;

    return {
      ...connection,
      api_key: shouldKeepExistingKey
        ? existingConnection?.api_key || ""
        : incomingKey,
      models_cache: Array.isArray(connection.models_cache)
        ? connection.models_cache.filter(isNonEmptyString)
        : [],
    };
  });
}

export function normalizeModelsResponse(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return record.id || record.name || record.value || record.label;
        }
        return "";
      })
      .filter(isNonEmptyString);
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return normalizeModelsResponse(record.data);
    if (Array.isArray(record.models)) return normalizeModelsResponse(record.models);
  }

  return [];
}
