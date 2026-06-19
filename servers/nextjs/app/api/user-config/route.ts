import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { LLMConfig } from "@/types/llm_config";

const userConfigPath = process.env.USER_CONFIG_PATH || "./user_config.json";
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";
const CONFIGURED_SECRET_MARKER = "__configured__";

const SECRET_FIELDS: Array<keyof LLMConfig> = [
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "ANTHROPIC_API_KEY",
  "CUSTOM_LLM_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
  "IMAGE_GEN_API_KEY",
  "OPEN_WEBUI_IMAGE_API_KEY",
  "OPENAI_COMPAT_IMAGE_API_KEY",
  "AZURE_OPENAI_API_KEY",
  "BEDROCK_API_KEY",
  "BEDROCK_AWS_ACCESS_KEY_ID",
  "BEDROCK_AWS_SECRET_ACCESS_KEY",
  "BEDROCK_AWS_SESSION_TOKEN",
  "OPENROUTER_API_KEY",
  "FIREWORKS_API_KEY",
  "TOGETHER_API_KEY",
  "CEREBRAS_API_KEY",
  "LITELLM_API_KEY",
  "LMSTUDIO_API_KEY",
  "CODEX_ACCESS_TOKEN",
  "CODEX_REFRESH_TOKEN",
];

function compactConfig(config: LLMConfig): LLMConfig {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined)
  ) as LLMConfig;
}

function sanitizeConfig(config: LLMConfig): LLMConfig {
  const sanitized: LLMConfig = { ...config };
  for (const field of SECRET_FIELDS) {
    if (sanitized[field]) {
      (sanitized as Record<string, unknown>)[field] = CONFIGURED_SECRET_MARKER;
    }
  }
  return sanitized;
}

function readFileConfig(): LLMConfig {
  if (!fs.existsSync(userConfigPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(userConfigPath, "utf-8"));
}

function resolveSecretValue(
  userConfig: LLMConfig,
  existingConfig: LLMConfig,
  field: keyof LLMConfig
): string | undefined {
  const value = userConfig[field];
  if (value === CONFIGURED_SECRET_MARKER) {
    return existingConfig[field] as string | undefined;
  }
  return (value || existingConfig[field]) as string | undefined;
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
    OLLAMA_URL: process.env.OLLAMA_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    CUSTOM_LLM_URL: process.env.CUSTOM_LLM_URL,
    CUSTOM_LLM_API_KEY: process.env.CUSTOM_LLM_API_KEY,
    CUSTOM_MODEL: process.env.CUSTOM_MODEL,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
    PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
    OPEN_WEBUI_IMAGE_URL: process.env.OPEN_WEBUI_IMAGE_URL,
    OPEN_WEBUI_IMAGE_API_KEY: process.env.OPEN_WEBUI_IMAGE_API_KEY,
    OPENAI_COMPAT_IMAGE_BASE_URL: process.env.OPENAI_COMPAT_IMAGE_BASE_URL,
    OPENAI_COMPAT_IMAGE_API_KEY: process.env.OPENAI_COMPAT_IMAGE_API_KEY,
    OPENAI_COMPAT_IMAGE_MODEL: process.env.OPENAI_COMPAT_IMAGE_MODEL,
    COMFYUI_URL: process.env.COMFYUI_URL,
    COMFYUI_WORKFLOW: process.env.COMFYUI_WORKFLOW,
    DALL_E_3_QUALITY: process.env.DALL_E_3_QUALITY,
    GPT_IMAGE_1_5_QUALITY: process.env.GPT_IMAGE_1_5_QUALITY,
    IMAGE_GEN_API_KEY: process.env.IMAGE_GEN_API_KEY,
    IMAGE_GEN_BASE_URL: process.env.IMAGE_GEN_BASE_URL,
    IMAGE_GEN_MODEL: process.env.IMAGE_GEN_MODEL,
    TOOL_CALLS:
      process.env.TOOL_CALLS === undefined
        ? undefined
        : process.env.TOOL_CALLS === "true",
    DISABLE_THINKING:
      process.env.DISABLE_THINKING === undefined
        ? undefined
        : process.env.DISABLE_THINKING === "true",
    EXTENDED_REASONING:
      process.env.EXTENDED_REASONING === undefined
        ? undefined
        : process.env.EXTENDED_REASONING === "true",
    WEB_GROUNDING:
      process.env.WEB_GROUNDING === undefined
        ? undefined
        : process.env.WEB_GROUNDING === "true",
    USE_CUSTOM_URL:
      process.env.USE_CUSTOM_URL === undefined
        ? undefined
        : process.env.USE_CUSTOM_URL === "true",
    DISABLE_IMAGE_GENERATION:
      process.env.DISABLE_IMAGE_GENERATION === undefined
        ? undefined
        : process.env.DISABLE_IMAGE_GENERATION === "true",
  });
}

export async function GET() {
  if (!userConfigPath) {
    return NextResponse.json({
      error: "User config path not found",
      status: 500,
    });
  }

  const fileConfig = readFileConfig();
  const effectiveConfig = {
    ...getConfigFromEnv(),
    ...fileConfig,
  };

  if (!canChangeKeys) {
    // In locked deployments, env must remain authoritative over persisted app_data.
    Object.assign(effectiveConfig, getConfigFromEnv());
  }

  return NextResponse.json(sanitizeConfig(effectiveConfig));
}

export async function POST(request: Request) {
  if (!canChangeKeys) {
    return NextResponse.json({
      error: "You are not allowed to access this resource",
    });
  }

  const userConfig = await request.json();
  fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });

  const existingConfig: LLMConfig = {
    ...getConfigFromEnv(),
    ...readFileConfig(),
  };
  const mergedConfig: LLMConfig = {
    LLM: userConfig.LLM || existingConfig.LLM,
    OPENAI_API_KEY: resolveSecretValue(userConfig, existingConfig, "OPENAI_API_KEY"),
    OPENAI_MODEL: userConfig.OPENAI_MODEL || existingConfig.OPENAI_MODEL,
    GOOGLE_API_KEY: resolveSecretValue(userConfig, existingConfig, "GOOGLE_API_KEY"),
    GOOGLE_MODEL: userConfig.GOOGLE_MODEL || existingConfig.GOOGLE_MODEL,
    ANTHROPIC_API_KEY: resolveSecretValue(userConfig, existingConfig, "ANTHROPIC_API_KEY"),
    ANTHROPIC_MODEL:
      userConfig.ANTHROPIC_MODEL || existingConfig.ANTHROPIC_MODEL,
    OLLAMA_URL: userConfig.OLLAMA_URL || existingConfig.OLLAMA_URL,
    OLLAMA_MODEL: userConfig.OLLAMA_MODEL || existingConfig.OLLAMA_MODEL,
    CUSTOM_LLM_URL: userConfig.CUSTOM_LLM_URL || existingConfig.CUSTOM_LLM_URL,
    CUSTOM_LLM_API_KEY: resolveSecretValue(userConfig, existingConfig, "CUSTOM_LLM_API_KEY"),
    CUSTOM_MODEL: userConfig.CUSTOM_MODEL || existingConfig.CUSTOM_MODEL,
    DISABLE_IMAGE_GENERATION:
      userConfig.DISABLE_IMAGE_GENERATION === undefined
        ? existingConfig.DISABLE_IMAGE_GENERATION
        : userConfig.DISABLE_IMAGE_GENERATION,
    PIXABAY_API_KEY: resolveSecretValue(userConfig, existingConfig, "PIXABAY_API_KEY"),
    IMAGE_PROVIDER: userConfig.IMAGE_PROVIDER || existingConfig.IMAGE_PROVIDER,
    PEXELS_API_KEY: resolveSecretValue(userConfig, existingConfig, "PEXELS_API_KEY"),
    COMFYUI_URL: userConfig.COMFYUI_URL || existingConfig.COMFYUI_URL,
    COMFYUI_WORKFLOW:
      userConfig.COMFYUI_WORKFLOW || existingConfig.COMFYUI_WORKFLOW,
    OPEN_WEBUI_IMAGE_URL:
      userConfig.OPEN_WEBUI_IMAGE_URL || existingConfig.OPEN_WEBUI_IMAGE_URL,
    OPEN_WEBUI_IMAGE_API_KEY: resolveSecretValue(userConfig, existingConfig, "OPEN_WEBUI_IMAGE_API_KEY"),
    OPENAI_COMPAT_IMAGE_BASE_URL:
      userConfig.OPENAI_COMPAT_IMAGE_BASE_URL || existingConfig.OPENAI_COMPAT_IMAGE_BASE_URL,
    OPENAI_COMPAT_IMAGE_API_KEY: resolveSecretValue(userConfig, existingConfig, "OPENAI_COMPAT_IMAGE_API_KEY"),
    OPENAI_COMPAT_IMAGE_MODEL:
      userConfig.OPENAI_COMPAT_IMAGE_MODEL || existingConfig.OPENAI_COMPAT_IMAGE_MODEL,
    DALL_E_3_QUALITY:
      userConfig.DALL_E_3_QUALITY || existingConfig.DALL_E_3_QUALITY,
    GPT_IMAGE_1_5_QUALITY:
      userConfig.GPT_IMAGE_1_5_QUALITY || existingConfig.GPT_IMAGE_1_5_QUALITY,
    IMAGE_GEN_API_KEY: resolveSecretValue(userConfig, existingConfig, "IMAGE_GEN_API_KEY"),
    IMAGE_GEN_BASE_URL:
      userConfig.IMAGE_GEN_BASE_URL || existingConfig.IMAGE_GEN_BASE_URL,
    IMAGE_GEN_MODEL: userConfig.IMAGE_GEN_MODEL || existingConfig.IMAGE_GEN_MODEL,
    TOOL_CALLS:
      userConfig.TOOL_CALLS === undefined
        ? existingConfig.TOOL_CALLS
        : userConfig.TOOL_CALLS,
    DISABLE_THINKING:
      userConfig.DISABLE_THINKING === undefined
        ? existingConfig.DISABLE_THINKING
        : userConfig.DISABLE_THINKING,
    EXTENDED_REASONING:
      userConfig.EXTENDED_REASONING === undefined
        ? existingConfig.EXTENDED_REASONING
        : userConfig.EXTENDED_REASONING,
    WEB_GROUNDING:
      userConfig.WEB_GROUNDING === undefined
        ? existingConfig.WEB_GROUNDING
        : userConfig.WEB_GROUNDING,
    USE_CUSTOM_URL:
      userConfig.USE_CUSTOM_URL === undefined
        ? existingConfig.USE_CUSTOM_URL
        : userConfig.USE_CUSTOM_URL,
  };
  fs.writeFileSync(userConfigPath, JSON.stringify(mergedConfig));
  return NextResponse.json(sanitizeConfig(mergedConfig));
}
