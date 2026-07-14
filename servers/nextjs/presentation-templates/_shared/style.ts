import type { CSSProperties } from "react";

type StringMap = Record<string, string>;
type BlockStyleMap = Record<string, string>;

interface SlideStyleConfig {
  slide?: {
    colors?: StringMap;
    fonts?: StringMap;
  };
  blocks?: Record<string, BlockStyleMap>;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_REGEX = /^rgba?\(\s*[\d.%\s,]+\)$/i;
const HSL_COLOR_REGEX = /^hsla?\(\s*[\d.%\s,]+\)$/i;
const CSS_VAR_REGEX = /^var\(--[\w-]+(?:,\s*[^)]+)?\)$/i;
const SAFE_COLOR_NAME_REGEX = /^[a-zA-Z]+$/;
const UNSAFE_CHARS_REGEX = /[;{}<>\n\r]/;

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function toCamelCase(value: string): string {
  const snake = toSnakeCase(value);
  return snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function getFlexibleKeyValue(map?: StringMap | null, key?: string): string | undefined {
  if (!map || !key) return undefined;
  const candidates = [
    key,
    key.toLowerCase(),
    toSnakeCase(key),
    toCamelCase(key),
    key.replace(/-/g, "_"),
    key.replace(/_/g, "-"),
  ];
  for (const candidate of candidates) {
    if (typeof map[candidate] === "string" && map[candidate].trim()) {
      return map[candidate].trim();
    }
  }
  return undefined;
}

function isSafeColor(value: string): boolean {
  const color = value.trim();
  return (
    HEX_COLOR_REGEX.test(color) ||
    RGB_COLOR_REGEX.test(color) ||
    HSL_COLOR_REGEX.test(color) ||
    CSS_VAR_REGEX.test(color) ||
    SAFE_COLOR_NAME_REGEX.test(color)
  );
}

function sanitizeColor(value?: string, fallback?: string): string | undefined {
  if (value && !UNSAFE_CHARS_REGEX.test(value) && isSafeColor(value)) {
    return value.trim();
  }
  return fallback;
}

function sanitizeFont(value?: string, fallback?: string): string | undefined {
  if (value && !UNSAFE_CHARS_REGEX.test(value)) {
    return value.trim();
  }
  return fallback;
}

function parseHexColor(value: string): [number, number, number, number] | null {
  const normalized = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(normalized.length) || !/^[0-9a-f]+$/i.test(normalized)) {
    return null;
  }
  const expanded = normalized.length <= 4
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized;
  const alpha = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
    alpha,
  ];
}

function relativeLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

export function resolveContrastTextColor(
  background: string,
  darkText: string = "#000000",
  lightText: string = "#FFFFFF",
): string {
  const color = parseHexColor(background);
  if (!color) return darkText;

  const [red, green, blue, alpha] = color;
  const composite = (channel: number) => channel * alpha + 255 * (1 - alpha);
  const luminance =
    0.2126 * relativeLuminance(composite(red)) +
    0.7152 * relativeLuminance(composite(green)) +
    0.0722 * relativeLuminance(composite(blue));
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (luminance + 0.05);

  return contrastWithWhite > contrastWithBlack ? lightText : darkText;
}

export function getSlideStyleConfig(data: any): SlideStyleConfig | null {
  const config = data?.__style__;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }
  return config as SlideStyleConfig;
}

export function resolveSlideColor(
  data: any,
  slideColorToken: string,
  fallback: string,
): string {
  const config = getSlideStyleConfig(data);
  const value = getFlexibleKeyValue(config?.slide?.colors, slideColorToken);
  return sanitizeColor(value, fallback) || fallback;
}

export function resolveColor(
  data: any,
  blockId: string,
  blockColorProp: string,
  fallback: string,
  slideColorToken?: string,
): string {
  const config = getSlideStyleConfig(data);
  const blockStyle = config?.blocks?.[blockId];
  const blockValue = getFlexibleKeyValue(blockStyle, blockColorProp);
  if (blockValue) {
    return sanitizeColor(blockValue, fallback) || fallback;
  }

  if (slideColorToken) {
    return resolveSlideColor(data, slideColorToken, fallback);
  }

  return fallback;
}

export function resolveSlideFont(
  data: any,
  slideFontToken: string,
  fallback: string,
): string {
  const config = getSlideStyleConfig(data);
  const value = getFlexibleKeyValue(config?.slide?.fonts, slideFontToken);
  return sanitizeFont(value, fallback) || fallback;
}

export function resolveFontFamily(
  data: any,
  blockId: string,
  fallback: string,
  slideFontToken: string = "body",
): string {
  const config = getSlideStyleConfig(data);
  const blockStyle = config?.blocks?.[blockId];

  const directFont =
    getFlexibleKeyValue(blockStyle, "fontFamily") ||
    getFlexibleKeyValue(blockStyle, "font_family");
  if (directFont) {
    return sanitizeFont(directFont, fallback) || fallback;
  }

  const blockFontToken = getFlexibleKeyValue(blockStyle, "font");
  if (blockFontToken) {
    const mappedFont = getFlexibleKeyValue(config?.slide?.fonts, blockFontToken);
    if (mappedFont) {
      return sanitizeFont(mappedFont, fallback) || fallback;
    }
    return sanitizeFont(blockFontToken, fallback) || fallback;
  }

  return resolveSlideFont(data, slideFontToken, fallback);
}

export function resolveRootStyle(
  data: any,
  fallbackBackground: string = "#FFFFFF",
  fallbackFont: string = "var(--template-font, Inter)",
): CSSProperties {
  return {
    backgroundColor: resolveColor(
      data,
      "container",
      "background",
      fallbackBackground,
      "background",
    ),
    fontFamily: resolveFontFamily(data, "container", fallbackFont, "body"),
    ["--style-text-primary" as any]: resolveSlideColor(
      data,
      "text_primary",
      "#3f3f3f",
    ),
    ["--style-surface" as any]: resolveSlideColor(data, "surface", "#E6E6E6"),
    ["--style-accent" as any]: resolveSlideColor(data, "accent", "#3f3f3f"),
  };
}

export function resolveTemplateVars(
  data: any,
  fallbackBackground: string = "#FFFFFF",
  fallbackFont: string = "var(--template-font, Inter)",
): CSSProperties {
  return {
    ...resolveRootStyle(data, fallbackBackground, fallbackFont),
    ["--style-text-primary" as any]: resolveSlideColor(
      data,
      "text_primary",
      "#3f3f3f",
    ),
    ["--style-surface" as any]: resolveSlideColor(data, "surface", "#E6E6E6"),
    ["--style-accent" as any]: resolveSlideColor(data, "accent", "#3f3f3f"),
  };
}
