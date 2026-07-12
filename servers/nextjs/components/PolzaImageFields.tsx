"use client";

import { getHeader } from "@/app/(presentation-generator)/services/api/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiUrl } from "@/utils/api";
import { CONFIGURED_SECRET_MARKER } from "@/utils/llmProviderProfiles";
import { Loader2, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

type Scalar = string | number | boolean;
type ParameterSchema = {
  required?: boolean;
  default?: Scalar;
  values?: Scalar[];
  description?: string;
};

type PolzaModel = {
  id: string;
  name: string;
  endpoints: string[];
  parameters: Record<string, ParameterSchema>;
  compatible: boolean;
};

type Props = {
  baseUrl: string;
  apiKey: string;
  model: string;
  options: Record<string, Scalar>;
  onChange: (patch: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    options?: Record<string, Scalar>;
  }) => void;
};

function defaultValue(name: string, schema: ParameterSchema): Scalar | undefined {
  if (schema.default !== undefined && schema.default !== null) return schema.default;
  if (name === "aspect_ratio" && schema.values?.includes("1:1")) return "1:1";
  return schema.required ? schema.values?.[0] : undefined;
}

function compatibleOptions(
  schemas: Record<string, ParameterSchema>,
  current: Record<string, Scalar>
) {
  const next: Record<string, Scalar> = {};
  for (const [name, schema] of Object.entries(schemas)) {
    if (["prompt", "images", "videos"].includes(name)) continue;
    let value: Scalar | undefined = current[name];
    if (schema.values?.length && (value === undefined || !schema.values.includes(value))) value = undefined;
    value ??= defaultValue(name, schema);
    if (value !== undefined) next[name] = value;
  }
  return next;
}

export default function PolzaImageFields({
  baseUrl,
  apiKey,
  model,
  options,
  onChange,
}: Props) {
  const [models, setModels] = useState<PolzaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => models.find((item) => item.id === model), [models, model]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/v1/ppt/image-providers/polza/models"), {
        method: "POST",
        headers: { ...getHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: baseUrl || "https://polza.ai/api/v1",
          api_key: apiKey || CONFIGURED_SECRET_MARKER,
          force: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load Polza models");
      setModels(data.models || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load Polza models");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-w-[260px] gap-3 sm:min-w-[520px] sm:grid-cols-2">
      <label className="text-sm font-medium text-gray-700">
        Base URL
        <Input
          className="mt-2 h-11"
          value={baseUrl}
          onChange={(event) => onChange({ baseUrl: event.target.value })}
          placeholder="https://polza.ai/api/v1"
        />
      </label>
      <label className="text-sm font-medium text-gray-700">
        API key
        <Input
          className="mt-2 h-11"
          type="password"
          value={apiKey === CONFIGURED_SECRET_MARKER ? "" : apiKey}
          onChange={(event) => onChange({ apiKey: event.target.value })}
          placeholder={apiKey === CONFIGURED_SECRET_MARKER ? "Key configured" : "Polza API key"}
        />
      </label>
      <label className="text-sm font-medium text-gray-700">
        Image model
        <select
          className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={model}
          onChange={(event) => {
            const nextModel = models.find((item) => item.id === event.target.value);
            onChange({
              model: event.target.value,
              options: compatibleOptions(nextModel?.parameters || {}, options),
            });
          }}
        >
          <option value="">Select a model</option>
          {model && !models.some((item) => item.id === model) ? (
            <option value={model}>{model} (saved)</option>
          ) : null}
          {models.map((item) => (
            <option key={item.id} value={item.id} disabled={!item.compatible}>
              {item.name}{item.compatible ? "" : " (reference image required)"}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="button" variant="outline" className="h-11" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Load models
        </Button>
      </div>
      {selected
        ? Object.entries(selected.parameters).map(([name, schema]) => {
            if (["prompt", "images", "videos"].includes(name)) return null;
            const values = schema.values || [];
            if (!values.length) return null;
            return (
              <label key={name} className="text-sm font-medium text-gray-700">
                {name.replaceAll("_", " ")}
                <select
                  className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={String(options[name] ?? defaultValue(name, schema) ?? "")}
                  onChange={(event) => {
                    const nextOptions = { ...options };
                    if (!event.target.value) {
                      delete nextOptions[name];
                    } else {
                      nextOptions[name] =
                        values.find((value) => String(value) === event.target.value) ??
                        event.target.value;
                    }
                    onChange({ options: nextOptions });
                  }}
                >
                  {!schema.required ? <option value="">Provider default</option> : null}
                  {values.map((value) => <option key={String(value)} value={String(value)}>{String(value)}</option>)}
                </select>
              </label>
            );
          })
        : null}
      {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
    </div>
  );
}
