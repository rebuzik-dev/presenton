"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PromptKind = "image" | "icon" | "text";

interface PromptEntry {
  path: string;
  key: string;
  kind: PromptKind;
  value: string;
  description?: string;
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

const collectSchemaPromptDescriptions = (
  schema: any
): { byPath: Map<string, string>; byKey: Map<string, string> } => {
  const byPath = new Map<string, string>();
  const byKey = new Map<string, string>();
  const visited = new WeakSet<object>();

  const walk = (node: any, path: string[]) => {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);

    const properties = node?.properties as Record<string, any> | undefined;
    if (properties && typeof properties === "object") {
      for (const [key, childNode] of Object.entries(properties)) {
        const nextPath = [...path, key];
        if (isPromptKey(key)) {
          const description =
            (typeof childNode?.description === "string" && childNode.description) ||
            (typeof node?.description === "string" && node.description);
          if (description) {
            byPath.set(normalizePath(nextPath), description);
            byKey.set(key.toLowerCase(), description);
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
  schemaDescriptions: { byPath: Map<string, string>; byKey: Map<string, string> }
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
            description:
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

  const schemaDescriptions = useMemo(
    () => collectSchemaPromptDescriptions(schema),
    [schema]
  );

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
        title: matchedPrompt?.description || "Image generation prompt",
        content: promptContent,
        path: matchedPrompt?.path,
      });
    });

    const seenTextBlocks = new Set<string>();
    const textElements = Array.from(slideRoot.querySelectorAll<HTMLElement>(TEXT_SELECTOR));

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

      nextOverlays.push({
        id: `text-${nextId++}`,
        type: "text",
        left: rect.left - wrapperRect.left,
        top: rect.top - wrapperRect.top,
        width: rect.width,
        height: rect.height,
        title: "Rendered text block",
        content: text,
      });
    });

    setOverlays(nextOverlays);
    setActiveOverlayId((previousId) => {
      if (!previousId) return nextOverlays[0]?.id || null;
      return nextOverlays.some((item) => item.id === previousId)
        ? previousId
        : nextOverlays[0]?.id || null;
    });
  }, [imagePromptByValue, imagePromptEntries]);

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

          <p className="mt-2 max-h-32 overflow-auto text-xs text-gray-700 whitespace-pre-wrap break-words select-text">
            {activeOverlay.content}
          </p>
        </div>
      )}
    </div>
  );
};

export default LayoutMetadataPreview;

