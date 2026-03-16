"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PromptKind = "image" | "icon" | "text";

interface SchemaFieldMeta {
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

interface PromptEntry {
  path: string;
  key: string;
  kind: PromptKind;
  value: string;
  meta?: SchemaFieldMeta;
}

interface TextMetaEntry {
  path: string;
  value: string;
  normalizedValue: string;
  meta?: SchemaFieldMeta;
}

interface OverlayItem {
  id: string;
  type: "image" | "text";
  left: number;
  top: number;
  width: number;
  height: number;
  title: string;
  content: string;
  path?: string;
  constraints?: string;
}

interface LayoutMetadataPreviewProps {
  LayoutComponent: React.ComponentType<any>;
  sampleData: any;
  schema: any;
  previewFontFamily: string;
}

const TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote";

const GENERIC_ALT_VALUES = new Set([
  "image",
  "background",
  "photo",
  "icon",
  "cover",
  "logo",
  "illustration",
]);

const normalizePath = (parts: string[]): string => parts.join(".");
const normalizeTextValue = (value: string): string =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

const extractFieldMeta = (node: any): SchemaFieldMeta => {
  const nextMeta: SchemaFieldMeta = {};

  if (typeof node?.description === "string" && node.description.trim()) {
    nextMeta.description = node.description.trim();
  }

  if (typeof node?.minLength === "number") nextMeta.minLength = node.minLength;
  if (typeof node?.maxLength === "number") nextMeta.maxLength = node.maxLength;
  if (typeof node?.minimum === "number") nextMeta.minimum = node.minimum;
  if (typeof node?.maximum === "number") nextMeta.maximum = node.maximum;
  if (typeof node?.minItems === "number") nextMeta.minItems = node.minItems;
  if (typeof node?.maxItems === "number") nextMeta.maxItems = node.maxItems;

  return nextMeta;
};

const mergeFieldMeta = (
  primary: SchemaFieldMeta,
  fallback?: SchemaFieldMeta
): SchemaFieldMeta => ({
  description: primary.description || fallback?.description,
  minLength: primary.minLength ?? fallback?.minLength,
  maxLength: primary.maxLength ?? fallback?.maxLength,
  minimum: primary.minimum ?? fallback?.minimum,
  maximum: primary.maximum ?? fallback?.maximum,
  minItems: primary.minItems ?? fallback?.minItems,
  maxItems: primary.maxItems ?? fallback?.maxItems,
});

const hasAnyMeta = (meta?: SchemaFieldMeta): boolean =>
  Boolean(
    meta &&
      (meta.description ||
        meta.minLength !== undefined ||
        meta.maxLength !== undefined ||
        meta.minimum !== undefined ||
        meta.maximum !== undefined ||
        meta.minItems !== undefined ||
        meta.maxItems !== undefined)
  );

const formatMetaMinMax = (meta?: SchemaFieldMeta): string | undefined => {
  if (!meta) return undefined;
  const groups: string[] = [];

  if (meta.minLength !== undefined || meta.maxLength !== undefined) {
    groups.push(
      `length: ${meta.minLength !== undefined ? meta.minLength : "?"}..${
        meta.maxLength !== undefined ? meta.maxLength : "?"
      }`
    );
  }

  if (meta.minimum !== undefined || meta.maximum !== undefined) {
    groups.push(
      `value: ${meta.minimum !== undefined ? meta.minimum : "?"}..${
        meta.maximum !== undefined ? meta.maximum : "?"
      }`
    );
  }

  if (meta.minItems !== undefined || meta.maxItems !== undefined) {
    groups.push(
      `items: ${meta.minItems !== undefined ? meta.minItems : "?"}..${
        meta.maxItems !== undefined ? meta.maxItems : "?"
      }`
    );
  }

  if (groups.length === 0) return undefined;
  return groups.join(" | ");
};

const getNearestFieldKey = (path: string[]): string => {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    if (path[index] !== "[]") return path[index];
  }
  return "";
};

const isLikelyUrlField = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes("url") || lowerKey.endsWith("_src") || lowerKey.endsWith("href");
};

const isPromptKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes("prompt") ||
    lowerKey === "__icon_query__" ||
    lowerKey === "icon_query"
  );
};

const detectPromptKind = (key: string): PromptKind => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("image_prompt")) return "image";
  if (lowerKey.includes("icon_prompt") || lowerKey.includes("icon_query")) return "icon";
  return "text";
};

const collectSchemaFieldDescriptions = (
  schema: any
): { byPath: Map<string, SchemaFieldMeta>; byKey: Map<string, SchemaFieldMeta> } => {
  const byPath = new Map<string, SchemaFieldMeta>();
  const byKey = new Map<string, SchemaFieldMeta>();
  const visited = new WeakSet<object>();

  const walk = (node: any, path: string[]) => {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);

    const currentMeta = extractFieldMeta(node);

    if (hasAnyMeta(currentMeta) && path.length > 0) {
      const normalizedCurrentPath = normalizePath(path);
      if (!byPath.has(normalizedCurrentPath)) {
        byPath.set(normalizedCurrentPath, currentMeta);
      }
      const currentKey = getNearestFieldKey(path).toLowerCase();
      if (currentKey && !byKey.has(currentKey)) {
        byKey.set(currentKey, currentMeta);
      }
    }

    const properties = node?.properties as Record<string, any> | undefined;
    if (properties && typeof properties === "object") {
      for (const [key, childNode] of Object.entries(properties)) {
        const nextPath = [...path, key];
        const propertyMeta = mergeFieldMeta(extractFieldMeta(childNode), currentMeta);
        if (hasAnyMeta(propertyMeta)) {
          const normalizedPropertyPath = normalizePath(nextPath);
          if (!byPath.has(normalizedPropertyPath)) {
            byPath.set(normalizedPropertyPath, propertyMeta);
          }
          const lowerKey = key.toLowerCase();
          if (!byKey.has(lowerKey)) {
            byKey.set(lowerKey, propertyMeta);
          }
        }
        walk(childNode, nextPath);
      }
    }

    if (node?.items) {
      walk(node.items, [...path, "[]"]);
    }

    const unionBranches: any[] = []
      .concat(Array.isArray(node?.anyOf) ? node.anyOf : [])
      .concat(Array.isArray(node?.oneOf) ? node.oneOf : [])
      .concat(Array.isArray(node?.allOf) ? node.allOf : []);

    unionBranches.forEach((branch) => walk(branch, path));
  };

  walk(schema, []);
  return { byPath, byKey };
};

const collectPromptEntries = (
  sampleData: any,
  schemaDescriptions: { byPath: Map<string, SchemaFieldMeta>; byKey: Map<string, SchemaFieldMeta> }
): PromptEntry[] => {
  const entries: PromptEntry[] = [];

  const walk = (value: any, path: string[]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, [...path, "[]"]));
      return;
    }

    if (!value || typeof value !== "object") return;

    Object.entries(value).forEach(([key, child]) => {
      const nextPath = [...path, key];
      if (isPromptKey(key) && typeof child === "string") {
        const trimmedValue = child.trim();
        if (trimmedValue) {
          const normalizedPath = normalizePath(nextPath);
          entries.push({
            path: normalizedPath,
            key,
            kind: detectPromptKind(key),
            value: trimmedValue,
            meta:
              schemaDescriptions.byPath.get(normalizedPath) ||
              schemaDescriptions.byKey.get(key.toLowerCase()),
          });
        }
      }
      walk(child, nextPath);
    });
  };

  walk(sampleData, []);

  const deduped = new Map<string, PromptEntry>();
  entries.forEach((entry) => {
    const signature = `${entry.path}::${entry.value}`;
    if (!deduped.has(signature)) deduped.set(signature, entry);
  });
  return Array.from(deduped.values());
};

const collectTextMetaEntries = (
  sampleData: any,
  schemaDescriptions: { byPath: Map<string, SchemaFieldMeta>; byKey: Map<string, SchemaFieldMeta> }
): TextMetaEntry[] => {
  const entries: TextMetaEntry[] = [];

  const walk = (value: any, path: string[]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, [...path, "[]"]));
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => {
        walk(child, [...path, key]);
      });
      return;
    }

    if (typeof value !== "string") return;
    const trimmedValue = value.replace(/\s+/g, " ").trim();
    if (!trimmedValue) return;

    const key = getNearestFieldKey(path);
    if (!key) return;
    if (isPromptKey(key) || isLikelyUrlField(key)) return;

    const normalizedPath = normalizePath(path);
    const meta =
      schemaDescriptions.byPath.get(normalizedPath) ||
      schemaDescriptions.byPath.get(normalizedPath.replace(/\.?\[\]$/, "")) ||
      schemaDescriptions.byKey.get(key.toLowerCase());

    entries.push({
      path: normalizedPath,
      value: trimmedValue,
      normalizedValue: normalizeTextValue(trimmedValue),
      meta,
    });
  };

  walk(sampleData, []);

  const deduped = new Map<string, TextMetaEntry>();
  entries.forEach((entry) => {
    const signature = `${entry.path}::${entry.normalizedValue}`;
    if (!deduped.has(signature)) deduped.set(signature, entry);
  });
  return Array.from(deduped.values());
};

const isSlidePromptPath = (path: string): boolean => {
  const normalized = path.toLowerCase();
  return (
    normalized === "prompt" ||
    normalized === "__slide_prompt__" ||
    normalized === "slide_prompt" ||
    normalized.endsWith(".prompt") ||
    normalized.endsWith(".__slide_prompt__") ||
    normalized.endsWith(".slide_prompt")
  );
};

const LayoutMetadataPreview: React.FC<LayoutMetadataPreviewProps> = ({
  LayoutComponent,
  sampleData,
  schema,
  previewFontFamily,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const slideRootRef = useRef<HTMLDivElement | null>(null);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);

  const schemaDescriptions = useMemo(() => collectSchemaFieldDescriptions(schema), [schema]);

  const promptEntries = useMemo(
    () => collectPromptEntries(sampleData, schemaDescriptions),
    [sampleData, schemaDescriptions]
  );

  const imagePromptEntries = useMemo(
    () => promptEntries.filter((entry) => entry.kind === "image"),
    [promptEntries]
  );

  const imagePromptByValue = useMemo(() => {
    const map = new Map<string, PromptEntry>();
    imagePromptEntries.forEach((entry) => {
      const normalizedValue = entry.value.toLowerCase();
      if (!map.has(normalizedValue)) map.set(normalizedValue, entry);
    });
    return map;
  }, [imagePromptEntries]);

  const textMetaEntries = useMemo(
    () => collectTextMetaEntries(sampleData, schemaDescriptions),
    [sampleData, schemaDescriptions]
  );

  const textMetaByValue = useMemo(() => {
    const map = new Map<string, TextMetaEntry[]>();
    textMetaEntries.forEach((entry) => {
      const bucket = map.get(entry.normalizedValue);
      if (bucket) {
        bucket.push(entry);
      } else {
        map.set(entry.normalizedValue, [entry]);
      }
    });
    return map;
  }, [textMetaEntries]);

  const slidePrompt = useMemo(
    () => promptEntries.find((entry) => entry.kind === "text" && isSlidePromptPath(entry.path)),
    [promptEntries]
  );

  const recomputeOverlays = useCallback(() => {
    const wrapper = wrapperRef.current;
    const slideRoot = slideRootRef.current;
    if (!wrapper || !slideRoot) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const nextOverlays: OverlayItem[] = [];
    let nextId = 0;

    const fallbackImagePrompts = [...imagePromptEntries];

    const imageElements = Array.from(slideRoot.querySelectorAll<HTMLImageElement>("img"));
    imageElements.forEach((image) => {
      const rect = image.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) return;

      const altText = (image.getAttribute("alt") || "").trim();
      const normalizedAlt = altText.toLowerCase();
      let matchedPrompt: PromptEntry | undefined;

      if (normalizedAlt && !GENERIC_ALT_VALUES.has(normalizedAlt)) {
        matchedPrompt = imagePromptByValue.get(normalizedAlt);
      }
      if (!matchedPrompt) {
        matchedPrompt = fallbackImagePrompts.shift();
      }

      const promptContent =
        matchedPrompt?.value ||
        (normalizedAlt && !GENERIC_ALT_VALUES.has(normalizedAlt) ? altText : "") ||
        "No explicit image prompt found in sample data.";

      nextOverlays.push({
        id: `image-${nextId++}`,
        type: "image",
        left: rect.left - wrapperRect.left,
        top: rect.top - wrapperRect.top,
        width: rect.width,
        height: rect.height,
        title: matchedPrompt?.meta?.description || "Image generation prompt",
        content: promptContent,
        path: matchedPrompt?.path,
        constraints: formatMetaMinMax(matchedPrompt?.meta),
      });
    });

    const seenTextBlocks = new Set<string>();
    const textElements = Array.from(slideRoot.querySelectorAll<HTMLElement>(TEXT_SELECTOR));
    const remainingTextMetaByValue = new Map<string, TextMetaEntry[]>();
    textMetaByValue.forEach((entries, value) => {
      remainingTextMetaByValue.set(value, [...entries]);
    });

    textElements.forEach((element) => {
      if (element.querySelector(TEXT_SELECTOR)) return;

      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length < 3) return;

      const rect = element.getBoundingClientRect();
      if (rect.width < 30 || rect.height < 10) return;

      const signature = [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
        text.slice(0, 80),
      ].join(":");

      if (seenTextBlocks.has(signature)) return;
      seenTextBlocks.add(signature);

      const normalizedText = normalizeTextValue(text);
      let matchedMeta: TextMetaEntry | undefined;

      const exactMatchBucket = remainingTextMetaByValue.get(normalizedText);
      if (exactMatchBucket && exactMatchBucket.length > 0) {
        matchedMeta = exactMatchBucket.shift();
      }

      if (!matchedMeta && normalizedText.length >= 8) {
        for (const [candidateValue, bucket] of remainingTextMetaByValue.entries()) {
          if (!bucket.length) continue;
          if (
            candidateValue.includes(normalizedText) ||
            normalizedText.includes(candidateValue)
          ) {
            matchedMeta = bucket.shift();
            break;
          }
        }
      }

      nextOverlays.push({
        id: `text-${nextId++}`,
        type: "text",
        left: rect.left - wrapperRect.left,
        top: rect.top - wrapperRect.top,
        width: rect.width,
        height: rect.height,
        title: matchedMeta?.meta?.description || "Rendered text block",
        content: text,
        path: matchedMeta?.path,
        constraints: formatMetaMinMax(matchedMeta?.meta),
      });
    });

    setOverlays(nextOverlays);
    setActiveOverlayId((previousId) => {
      if (!previousId) return nextOverlays[0]?.id || null;
      return nextOverlays.some((item) => item.id === previousId)
        ? previousId
        : nextOverlays[0]?.id || null;
    });
  }, [imagePromptByValue, imagePromptEntries, textMetaByValue]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      recomputeOverlays();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [recomputeOverlays, previewFontFamily, sampleData, schema]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const slideRoot = slideRootRef.current;
    if (!wrapper || !slideRoot) return;

    const observer = new ResizeObserver(() => recomputeOverlays());
    observer.observe(wrapper);
    observer.observe(slideRoot);

    const onImageLoad = () => recomputeOverlays();
    const images = Array.from(slideRoot.querySelectorAll<HTMLImageElement>("img"));
    images.forEach((image) => {
      image.addEventListener("load", onImageLoad);
    });

    window.addEventListener("resize", recomputeOverlays);

    return () => {
      observer.disconnect();
      images.forEach((image) => {
        image.removeEventListener("load", onImageLoad);
      });
      window.removeEventListener("resize", recomputeOverlays);
    };
  }, [recomputeOverlays, sampleData]);

  const activeOverlay = useMemo(
    () => overlays.find((item) => item.id === activeOverlayId) || null,
    [activeOverlayId, overlays]
  );

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full overflow-hidden"
      onMouseLeave={() => setActiveOverlayId(null)}
    >
      <div
        ref={slideRootRef}
        className="h-full w-full"
        style={{ ["--template-font" as any]: previewFontFamily }}
      >
        <LayoutComponent data={sampleData} />
      </div>

      {slidePrompt && (
        <div className="absolute left-3 top-3 z-40 max-w-[70%] rounded-md border border-blue-200 bg-white/95 p-2 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] font-semibold text-blue-700">Slide-level prompt</p>
          <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-words select-text">
            {slidePrompt.value}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-30">
        {overlays.map((item) => {
          const isActive = item.id === activeOverlayId;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "pointer-events-auto absolute rounded-sm transition-colors",
                item.type === "image"
                  ? "border-2 border-amber-500/70 bg-amber-400/10 hover:bg-amber-400/20"
                  : "border border-sky-500/70 bg-sky-400/5 hover:bg-sky-400/15",
                isActive && "ring-2 ring-blue-500/70"
              )}
              style={{
                left: item.left,
                top: item.top,
                width: item.width,
                height: item.height,
              }}
              onMouseEnter={() => setActiveOverlayId(item.id)}
              onClick={() => setActiveOverlayId(item.id)}
            >
              <span className="sr-only">{item.title}</span>
            </button>
          );
        })}
      </div>

      {activeOverlay && (
        <div className="absolute bottom-3 left-3 right-3 z-40 rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900">{activeOverlay.title}</p>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                activeOverlay.type === "image"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-sky-100 text-sky-800"
              )}
            >
              {activeOverlay.type === "image" ? "Image" : "Text"}
            </span>
          </div>

          {activeOverlay.path && (
            <p className="mt-1 text-[11px] text-gray-500 font-mono">Path: {activeOverlay.path}</p>
          )}
          {activeOverlay.constraints && (
            <p className="mt-1 text-[11px] text-gray-600">min/max: {activeOverlay.constraints}</p>
          )}

          <p className="mt-2 max-h-32 overflow-auto text-xs text-gray-700 whitespace-pre-wrap break-words select-text">
            {activeOverlay.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default LayoutMetadataPreview;
