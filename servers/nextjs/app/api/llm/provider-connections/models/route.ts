import { NextResponse } from "next/server";
import fs from "fs";
import { LLMConfig, LLMProviderConnection } from "@/types/llm_config";
import { getFastAPIUrl } from "@/utils/api";
import {
  migrateLegacyLLMConfig,
  normalizeModelsResponse,
  CONFIGURED_SECRET_MARKER,
  sanitizeProviderConnectionSecrets,
} from "@/utils/llmProviderProfiles";

const userConfigPath = process.env.USER_CONFIG_PATH || "./user_config.json";
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";

function readFileConfig(): LLMConfig {
  if (!fs.existsSync(userConfigPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(userConfigPath, "utf-8"));
}

function compactConfig(config: LLMConfig): LLMConfig {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => {
      if (value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    })
  ) as LLMConfig;
}

function getConfigFromEnv(): LLMConfig {
  return compactConfig({
    LLM: process.env.LLM,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_MODEL: process.env.GOOGLE_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    CUSTOM_LLM_URL: process.env.CUSTOM_LLM_URL,
    CUSTOM_LLM_API_KEY: process.env.CUSTOM_LLM_API_KEY,
    CUSTOM_MODEL: process.env.CUSTOM_MODEL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY,
    FIREWORKS_BASE_URL: process.env.FIREWORKS_BASE_URL,
    FIREWORKS_MODEL: process.env.FIREWORKS_MODEL,
    TOGETHER_API_KEY: process.env.TOGETHER_API_KEY,
    TOGETHER_BASE_URL: process.env.TOGETHER_BASE_URL,
    TOGETHER_MODEL: process.env.TOGETHER_MODEL,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CEREBRAS_BASE_URL: process.env.CEREBRAS_BASE_URL,
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL,
    LITELLM_API_KEY: process.env.LITELLM_API_KEY,
    LITELLM_BASE_URL: process.env.LITELLM_BASE_URL,
    LITELLM_MODEL: process.env.LITELLM_MODEL,
    LMSTUDIO_API_KEY: process.env.LMSTUDIO_API_KEY,
    LMSTUDIO_BASE_URL: process.env.LMSTUDIO_BASE_URL,
    LMSTUDIO_MODEL: process.env.LMSTUDIO_MODEL,
    OLLAMA_URL: process.env.OLLAMA_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  });
}

function sanitizeError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Could not refresh models.";
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

function providerBaseUrl(connection: LLMProviderConnection): string {
  const baseUrl = (connection.base_url || "").trim();
  if (baseUrl) return baseUrl;
  switch (connection.provider_type) {
    case "openai":
      return "https://api.openai.com/v1";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "fireworks":
      return "https://api.fireworks.ai/inference/v1";
    case "together":
      return "https://api.together.ai/v1";
    case "cerebras":
      return "https://api.cerebras.ai/v1";
    case "lmstudio":
      return "http://localhost:1234/v1";
    default:
      return baseUrl;
  }
}

function normalizeOpenAICompatibleBaseUrl(rawUrl: string): string {
  const trimmed = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/models")) {
    url.pathname = pathname.slice(0, -"/models".length) || "/";
  }

  const normalizedPath = url.pathname.replace(/\/+$/, "");
  if (url.hostname === "polza.ai" && (normalizedPath === "" || normalizedPath === "/")) {
    url.pathname = "/api/v1";
  } else if (!normalizedPath.endsWith("/v1") && !normalizedPath.includes("/v1/")) {
    url.pathname = `${normalizedPath}/v1`.replace(/^\/\//, "/");
  }

  return url.toString().replace(/\/+$/, "");
}

async function requestOpenAICompatibleModels(connection: LLMProviderConnection): Promise<string[]> {
  const baseUrl = normalizeOpenAICompatibleBaseUrl(providerBaseUrl(connection));
  if (!baseUrl) return [];
  const modelsUrl = `${baseUrl.replace(/\/+$/, "")}/models`;
  const apiKey = (connection.api_key || "").trim();
  const headers: HeadersInit = { Accept: "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(modelsUrl, { method: "GET", headers });
  if (!response.ok) {
    throw new Error(`Provider models endpoint returned ${response.status}`);
  }
  return normalizeModelsResponse(await response.json());
}

async function requestModels(connection: LLMProviderConnection): Promise<string[]> {
  const fastApiUrl = getFastAPIUrl().replace(/\/$/, "");
  const apiKey = connection.api_key || "";

  if (connection.provider_type === "google") {
    const response = await fetch(`${fastApiUrl}/api/v1/ppt/google/models/available`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return normalizeModelsResponse(await response.json());
  }

  if (connection.provider_type === "anthropic") {
    const response = await fetch(`${fastApiUrl}/api/v1/ppt/anthropic/models/available`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return normalizeModelsResponse(await response.json());
  }

  if (connection.provider_type === "ollama") {
    const response = await fetch(`${fastApiUrl}/api/v1/ppt/ollama/models/supported`);
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    return normalizeModelsResponse(await response.json());
  }

  return requestOpenAICompatibleModels(connection);
}

export async function POST(request: Request) {
  if (!canChangeKeys) {
    return NextResponse.json(
      { error: "You are not allowed to access this resource" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const fileConfig = readFileConfig();
  const effectiveConfig = migrateLegacyLLMConfig({
    ...fileConfig,
    ...getConfigFromEnv(),
  });
  const connections = effectiveConfig.LLM_PROVIDER_CONNECTIONS || [];
  const draft = body?.connection as LLMProviderConnection | undefined;
  const connectionId = String(draft?.id || body?.connection_id || "");
  if (!connectionId) {
    return NextResponse.json({ error: "connection.id is required" }, { status: 400 });
  }
  const savedConnection = connections.find((candidate) => candidate.id === connectionId);
  const connection = draft
    ? {
        ...savedConnection,
        ...draft,
        api_key:
          !draft.api_key || draft.api_key === CONFIGURED_SECRET_MARKER
            ? savedConnection?.api_key
            : draft.api_key,
      }
    : savedConnection;
  if (!connection) {
    return NextResponse.json({ error: "Provider connection not found" }, { status: 404 });
  }

  try {
    const models = await requestModels(connection);
    const updatedAt = new Date().toISOString();
    const refreshedConnection: LLMProviderConnection = {
      ...connection,
      models_cache: models,
      models_cache_updated_at: updatedAt,
      models_cache_error: "",
    };

    return NextResponse.json({
      connection: sanitizeProviderConnectionSecrets([refreshedConnection])[0],
      models,
    });
  } catch (error) {
    const message = sanitizeError(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
