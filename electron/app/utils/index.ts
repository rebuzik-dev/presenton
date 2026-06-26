import net from 'net'
import treeKill from 'tree-kill'
import { getTempDir, getUserConfigPath, localhost } from './constants'
import { readUserConfigFile, updateUserConfigFile } from './user-config-store'

const CONFIGURED_SECRET_MARKER = "__configured__";

const SECRET_FIELDS: Array<keyof UserConfig> = [
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "ANTHROPIC_API_KEY",
  "CUSTOM_LLM_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
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
  "OPEN_WEBUI_IMAGE_API_KEY",
  "OPENAI_COMPAT_IMAGE_API_KEY",
  "IMAGE_GEN_API_KEY",
  "CODEX_ACCESS_TOKEN",
  "CODEX_REFRESH_TOKEN",
];

function mergeSecretFields(userConfig: UserConfig, existingConfig: UserConfig): UserConfig {
  const merged: UserConfig = {};
  for (const field of SECRET_FIELDS) {
    const value = userConfig[field];
    if (value === "" || value === CONFIGURED_SECRET_MARKER || value === undefined) {
      (merged as Record<string, unknown>)[field] = existingConfig[field];
    } else {
      (merged as Record<string, unknown>)[field] = value;
    }
  }
  return merged;
}

function mergeProviderConnectionSecrets(
  incoming: UserConfig["LLM_PROVIDER_CONNECTIONS"],
  existing: UserConfig["LLM_PROVIDER_CONNECTIONS"],
) {
  if (!Array.isArray(incoming)) return existing;
  const existingById = new Map((existing || []).map((connection) => [connection.id, connection]));
  return incoming.map((connection) => {
    const existingConnection = existingById.get(connection.id);
    const shouldKeepExistingKey =
      connection.api_key === undefined ||
      connection.api_key === "" ||
      connection.api_key === CONFIGURED_SECRET_MARKER;
    return {
      ...connection,
      api_key: shouldKeepExistingKey ? existingConnection?.api_key || "" : connection.api_key,
    };
  });
}

export function setUserConfig(userConfig: UserConfig) {
  const userConfigPath = getUserConfigPath()
  updateUserConfigFile<UserConfig>(userConfigPath, (existingConfig) => {
    const definedIncomingConfig: UserConfig = {};
    for (const field in userConfig) {
      const key = field as keyof UserConfig;
      if (userConfig[key] !== undefined) {
        (definedIncomingConfig as Record<string, unknown>)[key] = userConfig[key];
      }
    }
    return {
      ...existingConfig,
      ...definedIncomingConfig,
      ...mergeSecretFields(userConfig, existingConfig),
      LLM_PROVIDER_CONNECTIONS: mergeProviderConnectionSecrets(
        userConfig.LLM_PROVIDER_CONNECTIONS,
        existingConfig.LLM_PROVIDER_CONNECTIONS,
      ),
      LLM_MODEL_PROFILES: Array.isArray(userConfig.LLM_MODEL_PROFILES)
        ? userConfig.LLM_MODEL_PROFILES
        : existingConfig.LLM_MODEL_PROFILES,
      ACTIVE_LLM_MODEL_PROFILE_ID:
        userConfig.ACTIVE_LLM_MODEL_PROFILE_ID ?? existingConfig.ACTIVE_LLM_MODEL_PROFILE_ID,
      CODEX_ACCESS_TOKEN: existingConfig.CODEX_ACCESS_TOKEN,
      CODEX_REFRESH_TOKEN: existingConfig.CODEX_REFRESH_TOKEN,
      CODEX_TOKEN_EXPIRES: existingConfig.CODEX_TOKEN_EXPIRES,
      CODEX_ACCOUNT_ID: existingConfig.CODEX_ACCOUNT_ID,
    }
  })
}

export function getUserConfig(): UserConfig {
  const userConfigPath = getUserConfigPath()
  return readUserConfigFile<UserConfig>(userConfigPath)
}

export function setupEnv(fastApiPort: number, nextjsPort: number) {
  const { app } = require('electron');
  process.env.APP_VERSION = app.getVersion();
  process.env.SENTRY_RELEASE = process.env.SENTRY_RELEASE || `presenton-electron@${process.env.APP_VERSION}`;
  process.env.SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || (app.isPackaged ? 'production' : 'development');
  const tempDir = getTempDir();
  const userConfigPath = getUserConfigPath();
  process.env.NEXT_PUBLIC_FAST_API = `${localhost}:${fastApiPort}`;
  process.env.TEMP_DIRECTORY = tempDir;
  process.env.NEXT_PUBLIC_USER_CONFIG_PATH = userConfigPath;
  process.env.NEXT_PUBLIC_URL = `${localhost}:${nextjsPort}`;
  
  // Set environment variables for NextJS API routes
  process.env.USER_CONFIG_PATH = userConfigPath;
  // Read CAN_CHANGE_KEYS from existing env or default to true
  if (process.env.CAN_CHANGE_KEYS === undefined) {
    process.env.CAN_CHANGE_KEYS = "true";
  }
}


export function killProcess(pid: number, signal: NodeJS.Signals = "SIGTERM") {
  return new Promise((resolve, reject) => {
    treeKill(pid, signal, (err: any) => {
      if (err) {
        console.error(`Error killing process ${pid}:`, err)
        reject(err)
      } else {
        console.log(`Process ${pid} killed (${signal})`)
        resolve(true)
      }
    })
  })
}

export async function findUnusedPorts(startPort: number = 40000, count: number = 2): Promise<number[]> {
  const ports: number[] = [];
  console.log(`Finding ${count} unused ports starting from ${startPort}`);

  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  };

  let currentPort = startPort;
  while (ports.length < count) {
    if (await isPortAvailable(currentPort)) {
      ports.push(currentPort);
    }
    currentPort++;
  }

  return ports;
}


export function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '_');
}
