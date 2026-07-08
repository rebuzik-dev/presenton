export type EditableBlockType =
  | "text"
  | "image"
  | "group"
  | "background"
  | "decor"
  | "style"
  | "layout";

export interface EditableBlockContent {
  text?: string | null;
  image_prompt?: string | null;
}

export interface EditableBlockPrompt {
  source: "template_default" | "template_prompt_profile" | "override" | "generated";
  text?: string | null;
  override_text?: string | null;
}

export interface EditableSlideBlock {
  block_id: string;
  slide_index: number;
  layout_id: string;
  schema_path: string;
  type: EditableBlockType;
  semantic_name: string;
  description?: string | null;
  content: EditableBlockContent;
  prompt: EditableBlockPrompt;
  debug: Record<string, unknown>;
}

export interface EditableBlockPatchRequest {
  schema_path: string;
  semantic_name?: string | null;
  description?: string | null;
  text?: string | null;
  prompt_override?: string | null;
  image_prompt_override?: string | null;
  style_override?: Record<string, unknown> | null;
}

export interface EditableBlockPatchResponse {
  block: EditableSlideBlock;
  block_overrides: Record<string, unknown>;
}

export interface MeasuredEditableBlock extends EditableSlideBlock {
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  isDense?: boolean;
}

const ARRAY_INDEX_PATTERN = /\[(\d+)\]/g;

export function normalizeEditableBlockPath(path?: string | null): string {
  if (!path) return "";
  return path
    .trim()
    .replace(ARRAY_INDEX_PATTERN, ".$1")
    .replace(/\[\]/g, ".0")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) return segment;
      return /^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`;
    })
    .join("");
}

export function buildEditableBlockId(
  layoutId: string,
  type: EditableBlockType,
  schemaPath?: string | null
): string {
  const encodedLayout = encodeURIComponent(layoutId || "unknown-layout");
  if (type === "layout") return `${encodedLayout}:layout`;
  return `${encodedLayout}:${type}:${encodeURIComponent(normalizeEditableBlockPath(schemaPath) || "unknown")}`;
}

export function blockTypeFromPromptType(type?: string | null): EditableBlockType {
  return type === "image" ? "image" : "text";
}

export function semanticLabelForPath(path?: string | null): string {
  const normalized = normalizeEditableBlockPath(path);
  if (!normalized) return "Блок";
  if (normalized === "title") return "Заголовок";
  if (normalized === "subtitle") return "Подзаголовок";
  if (normalized === "image") return "Изображение";
  if (normalized.endsWith("__image_prompt__")) return "Промпт изображения";

  const bulletMatch = normalized.match(/^bullets\[(\d+)\]$/);
  if (bulletMatch) return `Пункт списка ${Number(bulletMatch[1]) + 1}`;

  const cardDescriptionMatch = normalized.match(/cards\[(\d+)\]\.description$/);
  if (cardDescriptionMatch) return `Описание карточки ${Number(cardDescriptionMatch[1]) + 1}`;

  const cardTitleMatch = normalized.match(/cards\[(\d+)\]\.title$/);
  if (cardTitleMatch) return `Название карточки ${Number(cardTitleMatch[1]) + 1}`;

  return normalized
    .replace(/__/g, "")
    .replace(/[_\.\[\]]+/g, " ")
    .trim()
    .replace(/^\S/, (value) => value.toUpperCase()) || "Блок";
}
