"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { notify } from "@/components/ui/sonner";
import {
  LLMConfig,
  LLMModelProfile,
  LLMProviderConnection,
} from "@/types/llm_config";
import {
  CONFIGURED_SECRET_MARKER,
  TEXT_PROVIDER_TYPES,
  migrateLegacyLLMConfig,
  resolveActiveProfileToLegacyConfig,
} from "@/utils/llmProviderProfiles";
import { LLM_PROVIDERS } from "@/utils/providerConstants";
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import CodexConfig from "./SettingCodex";

interface TextProviderProps {
  llmConfig: LLMConfig;
  setLlmConfig: React.Dispatch<React.SetStateAction<LLMConfig>>;
}

type ConnectionDraft = LLMProviderConnection;
type ProfileDraft = LLMModelProfile;

const DEFAULT_CONNECTION: ConnectionDraft = {
  id: "",
  name: "",
  provider_type: "openai_compatible",
  base_url: "https://api.vsellm.ru/v1",
  api_key: "",
  models_cache: [],
  is_active: true,
};

const DEFAULT_PROFILE: ProfileDraft = {
  id: "",
  name: "",
  provider_connection_id: "",
  model_id: "",
  purpose: "default",
  is_default: true,
  is_active: true,
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function providerLabel(providerType: string): string {
  if (providerType === "openai_compatible") return "Custom OpenAI-compatible";
  return LLM_PROVIDERS[providerType]?.label || providerType;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toConfigWithRuntime(config: LLMConfig): LLMConfig {
  return resolveActiveProfileToLegacyConfig(migrateLegacyLLMConfig(config));
}

const TextProvider = ({ llmConfig, setLlmConfig }: TextProviderProps) => {
  const normalizedConfig = useMemo(
    () => migrateLegacyLLMConfig(llmConfig),
    [llmConfig]
  );
  const connections = normalizedConfig.LLM_PROVIDER_CONNECTIONS || [];
  const profiles = normalizedConfig.LLM_MODEL_PROFILES || [];
  const activeProfileId = normalizedConfig.ACTIVE_LLM_MODEL_PROFILE_ID || "";
  const [connectionDraft, setConnectionDraft] =
    useState<ConnectionDraft>(DEFAULT_CONNECTION);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(DEFAULT_PROFILE);
  const [refreshingConnectionId, setRefreshingConnectionId] = useState("");
  const [connectionSheetOpen, setConnectionSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    setLlmConfig((prev) => {
      const migrated = migrateLegacyLLMConfig(prev);
      if (
        migrated.LLM_PROVIDER_CONNECTIONS === prev.LLM_PROVIDER_CONNECTIONS &&
        migrated.LLM_MODEL_PROFILES === prev.LLM_MODEL_PROFILES
      ) {
        return prev;
      }
      return migrated;
    });
  }, [setLlmConfig]);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const selectedProfileConnection = connections.find(
    (connection) => connection.id === profileDraft.provider_connection_id
  );
  const selectedConnectionModels = selectedProfileConnection?.models_cache || [];

  const patchConfig = (patch: Partial<LLMConfig>) => {
    setLlmConfig((prev) => toConfigWithRuntime({ ...prev, ...patch }));
  };

  const upsertConnection = () => {
    const name = connectionDraft.name.trim();
    if (!name) {
      notify.warning("Connection name is required");
      return;
    }

    const id = connectionDraft.id || createId("conn");
    const existingConnection = connections.find((connection) => connection.id === id);
    const nextConnection: LLMProviderConnection = {
      ...connectionDraft,
      id,
      name,
      provider_type: connectionDraft.provider_type || "openai_compatible",
      base_url: connectionDraft.base_url?.trim() || "",
      api_key: connectionDraft.api_key || existingConnection?.api_key || "",
      models_cache: connectionDraft.models_cache || [],
      is_active: connectionDraft.is_active !== false,
      updated_at: nowIso(),
      created_at: connectionDraft.created_at || nowIso(),
    };
    const exists = connections.some((connection) => connection.id === id);
    patchConfig({
      LLM_PROVIDER_CONNECTIONS: exists
        ? connections.map((connection) =>
            connection.id === id ? nextConnection : connection
          )
        : [...connections, nextConnection],
    });
    setConnectionDraft(DEFAULT_CONNECTION);
    setConnectionSheetOpen(false);
  };

  const editConnection = (connection: LLMProviderConnection) => {
    setConnectionDraft({ ...connection, api_key: "" });
    setConnectionSheetOpen(true);
  };

  const deleteConnection = (connectionId: string) => {
    const used = profiles.some(
      (profile) => profile.provider_connection_id === connectionId
    );
    if (used) {
      notify.warning("Connection is used by a model profile");
      return;
    }
    patchConfig({
      LLM_PROVIDER_CONNECTIONS: connections.filter(
        (connection) => connection.id !== connectionId
      ),
    });
  };

  const refreshModels = async (connection: LLMProviderConnection) => {
    const connectionId = connection.id || "draft";
    setRefreshingConnectionId(connectionId);
    try {
      const response = await fetch("/api/llm/provider-connections/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection: { ...connection, id: connectionId } }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not refresh models");
      }
      const nextConnections = connections.map((candidate) =>
        candidate.id === connectionId
          ? {
              ...candidate,
              models_cache: data.models || [],
              models_cache_updated_at: new Date().toISOString(),
              models_cache_error: "",
            }
          : connection
      );
      if (connectionId === "draft") {
        setConnectionDraft((draft) => ({
          ...draft,
          models_cache: data.models || [],
          models_cache_updated_at: new Date().toISOString(),
          models_cache_error: "",
        }));
      } else {
        patchConfig({ LLM_PROVIDER_CONNECTIONS: nextConnections });
      }
      notify.success("Models refreshed", `${data.models?.length || 0} models cached.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not refresh models";
      patchConfig({
        LLM_PROVIDER_CONNECTIONS: connections.map((connection) =>
          connection.id === connectionId
            ? { ...connection, models_cache_error: message }
            : connection
        ),
      });
      notify.error("Could not refresh models", message);
    } finally {
      setRefreshingConnectionId("");
    }
  };

  const upsertProfile = () => {
    if (!profileDraft.provider_connection_id) {
      notify.warning("Choose a provider connection");
      return;
    }
    const modelId = profileDraft.model_id.trim();
    if (!modelId) {
      notify.warning("Model ID is required");
      return;
    }

    const id = profileDraft.id || createId("model");
    const nextProfile: LLMModelProfile = {
      ...profileDraft,
      id,
      name: profileDraft.name.trim() || modelId,
      model_id: modelId,
      purpose: profileDraft.purpose || "default",
      is_active: profileDraft.is_active !== false,
      updated_at: nowIso(),
      created_at: profileDraft.created_at || nowIso(),
    };
    const exists = profiles.some((profile) => profile.id === id);
    const shouldBeDefault = !!nextProfile.is_default;
    const nextProfiles = (exists
      ? profiles.map((profile) => (profile.id === id ? nextProfile : profile))
      : [...profiles, nextProfile]
    ).map((profile) =>
      shouldBeDefault
        ? { ...profile, is_default: profile.id === id }
        : profile
    );

    patchConfig({
      LLM_MODEL_PROFILES: nextProfiles,
      ACTIVE_LLM_MODEL_PROFILE_ID: shouldBeDefault ? id : activeProfileId || id,
    });
    setProfileDraft(DEFAULT_PROFILE);
    setProfileSheetOpen(false);
  };

  const editProfile = (profile: LLMModelProfile) => {
    setProfileDraft({ ...profile });
    setProfileSheetOpen(true);
  };

  const setDefaultProfile = (profileId: string) => {
    patchConfig({
      LLM_MODEL_PROFILES: profiles.map((profile) => ({
        ...profile,
        is_default: profile.id === profileId,
      })),
      ACTIVE_LLM_MODEL_PROFILE_ID: profileId,
    });
  };

  const deleteProfile = (profileId: string) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    patchConfig({
      LLM_MODEL_PROFILES: nextProfiles,
      ACTIVE_LLM_MODEL_PROFILE_ID:
        activeProfileId === profileId
          ? nextProfiles.find((profile) => profile.is_default)?.id ||
            nextProfiles[0]?.id ||
            ""
          : activeProfileId,
    });
  };

  return (
    <div className="min-w-0 space-y-5 rounded-[12px] bg-[#F9F8F8] p-4 sm:p-5 lg:p-6">
      <section className="min-w-0 rounded-[12px] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-normal text-[#191919]">
              Provider Connections
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Save endpoint and key once, then reuse it across model profiles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeProfile ? (
              <span className="rounded-full border border-[#EDEEEF] px-3 py-1 text-xs text-[#494A4D]">
                Active: {activeProfile.name}
              </span>
            ) : null}
            <Button type="button" variant="outline" onClick={() => {
              setConnectionDraft(DEFAULT_CONNECTION);
              setConnectionSheetOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />Add connection
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {connections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
              No provider connections yet. Add one below to cache models.
            </div>
          ) : (
            connections.map((connection) => (
              <div
                key={connection.id}
                className="grid min-w-0 gap-3 rounded-lg border border-[#EDEEEF] p-4 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="min-w-0 truncate font-medium text-[#191919]">{connection.name}</h4>
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs text-gray-600">
                      {providerLabel(connection.provider_type)}
                    </span>
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs text-gray-600">
                      {connection.api_key ? "Key configured" : "No key"}
                    </span>
                  </div>
                  {connection.base_url ? (
                    <p className="mt-1 truncate text-sm text-gray-500">
                      {connection.base_url}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-500">
                    {(connection.models_cache || []).length} cached models
                    {connection.models_cache_updated_at
                      ? ` · refreshed ${new Date(
                          connection.models_cache_updated_at
                        ).toLocaleString()}`
                      : ""}
                  </p>
                  {connection.models_cache_error ? (
                    <p className="mt-2 text-xs text-red-600">
                      {connection.models_cache_error}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => editConnection(connection)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => refreshModels(connection)}
                    disabled={refreshingConnectionId === connection.id}
                  >
                    {refreshingConnectionId === connection.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => deleteConnection(connection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Sheet open={connectionSheetOpen} onOpenChange={setConnectionSheetOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{connectionDraft.id ? "Edit connection" : "Add connection"}</SheetTitle>
              <SheetDescription>
                Endpoint and key are saved only after you press Save Configuration.
              </SheetDescription>
            </SheetHeader>
        <div className="mt-5 grid min-w-0 gap-4 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Connection name
            <input
              value={connectionDraft.name}
              onChange={(event) =>
                setConnectionDraft((draft) => ({
                  ...draft,
                  name: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="vseLLM"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Provider type
            <select
              value={connectionDraft.provider_type}
              onChange={(event) =>
                setConnectionDraft((draft) => ({
                  ...draft,
                  provider_type: event.target.value,
                  base_url:
                    event.target.value === "openai_compatible" && !draft.base_url
                      ? "https://api.vsellm.ru/v1"
                      : draft.base_url,
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              {TEXT_PROVIDER_TYPES.map((providerType) => (
                <option key={providerType} value={providerType}>
                  {providerLabel(providerType)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">
            Base URL
            <input
              value={connectionDraft.base_url || ""}
              onChange={(event) =>
                setConnectionDraft((draft) => ({
                  ...draft,
                  base_url: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="https://api.vsellm.ru/v1"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            API key
            <input
              value={connectionDraft.api_key || ""}
              onChange={(event) =>
                setConnectionDraft((draft) => ({
                  ...draft,
                  api_key: event.target.value,
                }))
              }
              type="password"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder={
                connectionDraft.id ? "Leave blank to keep configured key" : "API key"
              }
            />
            {connectionDraft.id ? (
              <span className="mt-1 block text-xs text-gray-500">
                Empty or {CONFIGURED_SECRET_MARKER} keeps the saved key.
              </span>
            ) : null}
          </label>
          <div className="sm:col-span-2">
            <Button
              type="button"
              className="rounded-lg"
              onClick={upsertConnection}
            >
              <Plus className="mr-2 h-4 w-4" />
              {connectionDraft.id ? "Update connection" : "Add connection"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="ml-2 rounded-lg"
              onClick={() => refreshModels(connectionDraft)}
              disabled={refreshingConnectionId === (connectionDraft.id || "draft")}
            >
              {refreshingConnectionId === (connectionDraft.id || "draft") ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Check draft
            </Button>
          </div>
        </div>
          </SheetContent>
        </Sheet>
      </section>

      <section className="min-w-0 rounded-[12px] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-normal text-[#191919]">Model Profiles</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a saved connection and model. Profiles never store API keys.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => {
            setProfileDraft(DEFAULT_PROFILE);
            setProfileSheetOpen(true);
          }} disabled={connections.length === 0}>
            <Plus className="mr-2 h-4 w-4" />Add profile
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-500">
              No model profiles yet. Add a provider connection, refresh models,
              then create a default profile.
            </div>
          ) : (
            profiles.map((profile) => {
              const connection = connections.find(
                (candidate) => candidate.id === profile.provider_connection_id
              );
              const isActive = profile.id === activeProfileId;
              return (
                <div
                  key={profile.id}
                  className="grid min-w-0 gap-3 rounded-lg border border-[#EDEEEF] p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h4 className="min-w-0 truncate font-medium text-[#191919]">{profile.name}</h4>
                      {isActive ? (
                        <span className="rounded-full bg-[#EEF8F1] px-2 py-0.5 text-xs text-[#176B38]">
                          Active
                        </span>
                      ) : null}
                      {profile.is_default ? (
                        <span className="rounded-full bg-[#F7F2FF] px-2 py-0.5 text-xs text-[#6941C6]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-600">
                      {connection?.name || "Missing connection"} · {profile.model_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => editProfile(profile)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setDefaultProfile(profile.id)}
                    >
                      {isActive ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Star className="mr-2 h-4 w-4" />
                      )}
                      {isActive ? "Active" : "Make active"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => deleteProfile(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{profileDraft.id ? "Edit model profile" : "Add model profile"}</SheetTitle>
              <SheetDescription>
                Choose one saved connection and a global text model.
              </SheetDescription>
            </SheetHeader>
        <div className="mt-5 grid min-w-0 gap-4 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Profile name
            <input
              value={profileDraft.name}
              onChange={(event) =>
                setProfileDraft((draft) => ({
                  ...draft,
                  name: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="GPT presentation model"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Provider connection
            <select
              value={profileDraft.provider_connection_id}
              onChange={(event) =>
                setProfileDraft((draft) => ({
                  ...draft,
                  provider_connection_id: event.target.value,
                  model_id: "",
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">Choose connection</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Model
            <input
              list="text-model-options"
              value={profileDraft.model_id}
              onChange={(event) =>
                setProfileDraft((draft) => ({
                  ...draft,
                  model_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="openai/gpt-5.4"
            />
            <datalist id="text-model-options">
              {selectedConnectionModels.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
          <label className="flex items-center gap-2 pt-8 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={!!profileDraft.is_default}
              onChange={(event) =>
                setProfileDraft((draft) => ({
                  ...draft,
                  is_default: event.target.checked,
                }))
              }
            />
            Make active
          </label>
          <div className="sm:col-span-2">
            <Button type="button" className="rounded-lg" onClick={upsertProfile}>
              <Plus className="mr-2 h-4 w-4" />
              {profileDraft.id ? "Update profile" : "Add profile"}
            </Button>
          </div>
        </div>
          </SheetContent>
        </Sheet>
      </section>

      <section className="min-w-0 rounded-[12px] bg-white p-4 sm:p-5">
        <h3 className="text-xl font-normal text-[#191919]">ChatGPT OAuth</h3>
        <p className="mt-1 text-sm text-gray-500">
          ChatGPT remains available as a legacy OAuth provider.
        </p>
        <div className="mt-4 max-w-md">
          <CodexConfig
            codexModel={llmConfig.CODEX_MODEL || ""}
            onInputChange={(value, field) => {
              patchConfig({
                LLM: "codex",
                [field === "codex_model" ? "CODEX_MODEL" : field]: value,
              } as Partial<LLMConfig>);
            }}
          />
        </div>
      </section>
    </div>
  );
};

export default TextProvider;
