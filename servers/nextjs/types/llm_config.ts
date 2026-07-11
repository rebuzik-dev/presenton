export interface LLMProviderConnection {
  id: string;
  name: string;
  provider_type: string;
  base_url?: string;
  api_key?: string;
  models_cache?: string[];
  models_cache_updated_at?: string;
  models_cache_error?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LLMModelProfile {
  id: string;
  name: string;
  provider_connection_id: string;
  model_id: string;
  temperature?: number;
  max_tokens?: number | null;
  purpose?: "default" | "text" | "template" | string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LLMConfig {
  LLM?: string;

  // OpenAI
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;

  // Google
  GOOGLE_API_KEY?: string;
  GOOGLE_MODEL?: string;

  // Vertex AI
  VERTEX_API_KEY?: string;
  VERTEX_MODEL?: string;
  VERTEX_PROJECT?: string;
  VERTEX_LOCATION?: string;
  VERTEX_BASE_URL?: string;

  // Azure OpenAI
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_MODEL?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_BASE_URL?: string;
  AZURE_OPENAI_API_VERSION?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;

  // Amazon Bedrock
  BEDROCK_REGION?: string;
  BEDROCK_API_KEY?: string;
  BEDROCK_AWS_ACCESS_KEY_ID?: string;
  BEDROCK_AWS_SECRET_ACCESS_KEY?: string;
  BEDROCK_AWS_SESSION_TOKEN?: string;
  BEDROCK_PROFILE_NAME?: string;
  BEDROCK_MODEL?: string;

  // OpenRouter
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_BASE_URL?: string;

  // Fireworks
  FIREWORKS_API_KEY?: string;
  FIREWORKS_MODEL?: string;
  FIREWORKS_BASE_URL?: string;

  // Together AI
  TOGETHER_API_KEY?: string;
  TOGETHER_MODEL?: string;
  TOGETHER_BASE_URL?: string;

  // Cerebras
  CEREBRAS_API_KEY?: string;
  CEREBRAS_MODEL?: string;
  CEREBRAS_BASE_URL?: string;

  // LiteLLM
  LITELLM_BASE_URL?: string;
  LITELLM_API_KEY?: string;
  LITELLM_MODEL?: string;

  // LM Studio
  LMSTUDIO_BASE_URL?: string;
  LMSTUDIO_API_KEY?: string;
  LMSTUDIO_MODEL?: string;

  // Anthropic
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;

  // Ollama
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;

  // Custom LLM
  CUSTOM_LLM_URL?: string;
  CUSTOM_LLM_API_KEY?: string;
  CUSTOM_MODEL?: string;

  // Image providers
  DISABLE_IMAGE_GENERATION?: boolean;
  IMAGE_PROVIDER?: string;
  PEXELS_API_KEY?: string;
  PIXABAY_API_KEY?: string;

  // ComfyUI
  COMFYUI_URL?: string;
  COMFYUI_WORKFLOW?: string;

  // Open WebUI Image Provider
  OPEN_WEBUI_IMAGE_URL?: string;
  OPEN_WEBUI_IMAGE_API_KEY?: string;

  // OpenAI-compatible image API (LiteLLM, Azure, vLLM gateways, etc.)
  OPENAI_COMPAT_IMAGE_BASE_URL?: string;
  OPENAI_COMPAT_IMAGE_API_KEY?: string;
  OPENAI_COMPAT_IMAGE_MODEL?: string;

  // Dalle 3 Quality
  DALL_E_3_QUALITY?: string;
  // GPT Image 1.5 Quality
  GPT_IMAGE_1_5_QUALITY?: string;

  // Custom Image Gen Provider
  IMAGE_GEN_API_KEY?: string;
  IMAGE_GEN_BASE_URL?: string;
  IMAGE_GEN_MODEL?: string;
  POLZA_IMAGE_OPTIONS?: Record<string, string | number | boolean>;

  // Other Configs
  TOOL_CALLS?: boolean;
  DISABLE_THINKING?: boolean;
  EXTENDED_REASONING?: boolean;
  WEB_GROUNDING?: boolean;

  // Codex OAuth (ChatGPT)
  CODEX_MODEL?: string;
  CODEX_ACCESS_TOKEN?: string;
  CODEX_REFRESH_TOKEN?: string;
  CODEX_TOKEN_EXPIRES?: string;
  CODEX_ACCOUNT_ID?: string;
  CODEX_USERNAME?: string;
  CODEX_EMAIL?: string;
  CODEX_IS_PRO?: boolean;

  // Only used in UI settings
  USE_CUSTOM_URL?: boolean;

  // LLM provider connections and model profiles
  LLM_PROVIDER_CONNECTIONS?: LLMProviderConnection[];
  LLM_MODEL_PROFILES?: LLMModelProfile[];
  ACTIVE_LLM_MODEL_PROFILE_ID?: string;

  /** When `"true"`, anonymous analytics (Mixpanel) are off */
  DISABLE_ANONYMOUS_TRACKING?: string;
}
