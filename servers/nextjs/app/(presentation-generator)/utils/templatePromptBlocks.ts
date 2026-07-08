import type {
  FieldSummary,
  LayoutPromptOverrides,
  LayoutSummary,
  TemplatePromptProfileResponse,
} from "../hooks/useTemplatePromptProfile";
import {
  buildPromptBlockId,
  parsePromptBlockId,
  PromptBlockType,
  promptPathsMatch,
} from "./promptBlockIds";

export interface PromptBlock {
  id: string;
  type: PromptBlockType;
  label: string;
  path?: string;
  sourcePrompt?: string | null;
  savedOverride?: string | null;
  disabled?: boolean;
  disabledReason?: string;
}

export interface BuildTemplatePromptBlocksOptions {
  sampleData?: unknown;
  visualTargetIds?: Set<string>;
}

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const sourceFileStem = (value?: string | null) => {
  if (!value) return "";
  const fileName = value.split("/").pop() || value;
  return fileName.replace(/\.[^.]+$/, "");
};

const fieldIsTextPrompt = (field: FieldSummary) => (
  field.type === "string" &&
  field.special_kind !== "image_prompt" &&
  field.special_kind !== "image_url" &&
  field.special_kind !== "icon_url"
);

export function matchTemplatePromptLayout(
  data: TemplatePromptProfileResponse | null | undefined,
  candidates: Array<string | null | undefined>,
  index?: number
): LayoutSummary | null {
  const layouts = data?.schema_summary?.layouts || [];
  if (!layouts.length) return null;

  const normalizedCandidates = candidates
    .flatMap((candidate) => {
      if (!candidate) return [];
      return [candidate, sourceFileStem(candidate)];
    })
    .map(normalize)
    .filter(Boolean);

  const matched = layouts.find((layout) => {
    const values = [
      layout.layout_id,
      layout.layout_name,
      layout.source_file,
      sourceFileStem(layout.source_file),
    ].map(normalize);
    return normalizedCandidates.some((candidate) => values.includes(candidate));
  });

  if (matched) return matched;
  if (typeof index === "number") {
    return layouts.find((layout) => layout.index === index) || null;
  }
  return null;
}

function getImageSummary(data: TemplatePromptProfileResponse | null | undefined, layout: LayoutSummary) {
  return data?.image_summary?.slides?.find((slide) => (
    slide.layout_id === layout.layout_id ||
    normalize(slide.layout_name) === normalize(layout.layout_name) ||
    slide.index === layout.index
  ));
}

function getLayoutPromptState(data: TemplatePromptProfileResponse, layout: LayoutSummary): LayoutPromptOverrides {
  const layoutPrompts = data.prompt_profile?.layout_prompts || {};
  const candidates = [
    layout.layout_id,
    layout.layout_id.includes(":") ? layout.layout_id.split(":", 2)[1] : null,
    layout.layout_name,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const value = layoutPrompts[candidate];
    if (value) return value;
  }

  return {};
}

export function buildTemplatePromptBlocks(
  data: TemplatePromptProfileResponse | null | undefined,
  layout: LayoutSummary | null,
  options: BuildTemplatePromptBlocksOptions = {}
): PromptBlock[] {
  if (!data || !layout) return [];

  const layoutPromptState = getLayoutPromptState(data, layout);
  const textFields = (layout.fields_summary || []).filter(fieldIsTextPrompt);
  const imageFields = (layout.fields_summary || []).filter((field) => field.special_kind === "image_prompt");
  const imageSummary = getImageSummary(data, layout);
  const imagePrompts = imageSummary?.image_prompts || [];

  const blocks: PromptBlock[] = [
    {
      id: buildPromptBlockId(layout.layout_id, "layout"),
      type: "layout",
      label: "Layout prompt",
      sourcePrompt: layout.layout_description || null,
      savedOverride: layoutPromptState.layout_prompt || null,
    },
  ];

  textFields.forEach((field) => {
    const expandedFields = expandPromptField(field, "field", layout.layout_id, options);
    expandedFields.forEach((expandedField) => {
      blocks.push({
        id: buildPromptBlockId(layout.layout_id, "field", expandedField.path),
        type: "field",
        label: labelForFieldPath(expandedField.path, field.path),
        path: expandedField.path,
        sourcePrompt: field.description || null,
        savedOverride:
          layoutPromptState.field_prompts?.[expandedField.path] ||
          layoutPromptState.field_prompts?.[field.path] ||
          null,
      });
    });
  });

  const expandedImageFields = imageFields.flatMap((field) => (
    expandPromptField(field, "image", layout.layout_id, options, imageSummary?.image_prompt_slots || 0)
      .map((expandedField) => ({ field, expandedField }))
  ));

  expandedImageFields.forEach(({ field, expandedField }, imageIndex) => {
    const sourcePrompt = imagePrompts[imageIndex] || (typeof field.default === "string" ? field.default : field.description);
    blocks.push({
      id: buildPromptBlockId(layout.layout_id, "image", expandedField.path),
      type: "image",
      label: `Image prompt ${imageIndex + 1}`,
      path: expandedField.path,
      sourcePrompt: sourcePrompt || null,
      savedOverride:
        layoutPromptState.image_prompt_overrides?.[expandedField.path] ||
        layoutPromptState.image_prompt_overrides?.[field.path] ||
        null,
    });
  });

  const mappedImageSlots = expandedImageFields.length;
  const unmappedImageSlots = Math.max(
    0,
    (imageSummary?.image_prompt_slots || 0) - mappedImageSlots
  );
  for (let slotIndex = 0; slotIndex < unmappedImageSlots; slotIndex += 1) {
    const promptIndex = mappedImageSlots + slotIndex;
    blocks.push({
      id: buildPromptBlockId(layout.layout_id, "image", `unmapped.${slotIndex}`),
      type: "image",
      label: `Image prompt ${promptIndex + 1}`,
      sourcePrompt: imagePrompts[promptIndex] || null,
      disabled: true,
      disabledReason: "Editable schema path is unknown for this image slot.",
    });
  }

  return blocks;
}

function expandPromptField(
  field: FieldSummary,
  type: PromptBlockType,
  layoutId: string,
  options: BuildTemplatePromptBlocksOptions,
  imagePromptSlots = 0
): Array<FieldSummary & { path: string }> {
  if (!field.path.includes("[]")) {
    return [{ ...field, path: field.path }];
  }

  const fromTargets = concretePathsFromTargets(field.path, type, layoutId, options.visualTargetIds);
  if (fromTargets.length > 0) {
    return fromTargets.map((path) => ({ ...field, path }));
  }

  const fromSampleData = concretePathsFromSampleData(field.path, options.sampleData);
  if (fromSampleData.length > 0) {
    return fromSampleData.map((path) => ({ ...field, path }));
  }

  if (type === "image" && imagePromptSlots > 0) {
    return Array.from({ length: imagePromptSlots }, (_, index) => ({
      ...field,
      path: field.path.replace("[]", `[${index}]`),
    }));
  }

  return [{ ...field, path: field.path.replace("[]", "[0]") }];
}

function concretePathsFromTargets(
  wildcardPath: string,
  type: PromptBlockType,
  layoutId: string,
  visualTargetIds?: Set<string>
): string[] {
  if (!visualTargetIds) return [];
  const paths = new Set<string>();

  visualTargetIds.forEach((targetId) => {
    const identity = parsePromptBlockId(targetId);
    if (!identity || identity.layoutId !== layoutId || identity.type !== type || !identity.path) {
      return;
    }
    if (!promptPathsMatch(wildcardPath, identity.path) || identity.path.includes("[]")) {
      return;
    }
    paths.add(pathWithBracketIndexes(identity.path));
  });

  return Array.from(paths).sort(compareIndexedPaths);
}

function concretePathsFromSampleData(wildcardPath: string, sampleData: unknown): string[] {
  const [prefix, suffix] = wildcardPath.split("[]", 2);
  const arrayValue = valueAtPath(sampleData, prefix);
  if (!Array.isArray(arrayValue)) return [];
  return arrayValue.map((_, index) => `${prefix}[${index}]${suffix}`);
}

function valueAtPath(data: unknown, path: string): unknown {
  let current = data;
  const trimmedPath = path.replace(/\.$/, "");
  if (!trimmedPath) return current;

  for (const token of trimmedPath.split(".").filter(Boolean)) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(token)) {
      current = current[Number(token)];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function pathWithBracketIndexes(path: string): string {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  return parts.reduce((acc, part) => {
    if (/^\d+$/.test(part)) return `${acc}[${part}]`;
    return acc ? `${acc}.${part}` : part;
  }, "");
}

function compareIndexedPaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function labelForFieldPath(path: string, originalPath: string): string {
  const cardTitleMatch = path.match(/^cards\[(\d+)\]\.title$/);
  if (cardTitleMatch) return `Card title ${Number(cardTitleMatch[1]) + 1}`;

  const cardDescriptionMatch = path.match(/^cards\[(\d+)\]\.description$/);
  if (cardDescriptionMatch) return `Card description ${Number(cardDescriptionMatch[1]) + 1}`;

  const bulletMatch = path.match(/^(?:rightBullets|bullets|items|points)\[(\d+)\]$/);
  if (bulletMatch) return `Bullet ${Number(bulletMatch[1]) + 1}`;

  return originalPath.includes("[]") ? path : originalPath;
}
