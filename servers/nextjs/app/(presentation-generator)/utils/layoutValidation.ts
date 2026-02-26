"use client";

export type LayoutIssueType = "overflow" | "out_of_bounds";
export type LayoutTextRole =
  | "title"
  | "subtitle"
  | "body"
  | "caption"
  | "locked";

export interface LayoutValidationIssue {
  type: LayoutIssueType;
  path: string;
  message: string;
  slideIndex: number;
  role: LayoutTextRole;
  groupKey?: string;
  density?: number;
}

export interface LayoutValidationBlock {
  fontScale?: number;
}

export interface LayoutValidationResult {
  status: "ok" | "fixed" | "failed";
  groups: Record<string, LayoutValidationBlock>;
  blocks: Record<string, LayoutValidationBlock>;
  issues: LayoutValidationIssue[];
  unresolvedIssues: LayoutValidationIssue[];
  appliedFixes: Array<{
    path: string;
    previousScale: number;
    nextScale: number;
  }>;
  clampedPaths: string[];
  density: {
    maxDensity: number;
    byPath: Record<string, number>;
  };
}

interface ValidateOptions {
  maxIterations?: number;
  minScale?: number;
  scaleStep?: number;
  slideIndex?: number;
  clampOnFail?: boolean;
}

const CLIPPING_VALUES = new Set(["hidden", "clip", "auto", "scroll"]);
const LOCKED_ROLES = new Set<LayoutTextRole>(["title", "subtitle", "locked"]);
const ADAPTIVE_ROLES = new Set<LayoutTextRole>(["body", "caption"]);
const LEGACY_GLOBAL_SCALE_KEY = "__all__";

export const DEFAULT_LAYOUT_GROUP = "body";
export const GROUP_KEY_PREFIX = "group:";

const normalizeRole = (rawRole?: string | null): LayoutTextRole | null => {
  if (!rawRole) return null;
  const normalized = rawRole.trim().toLowerCase();
  if (
    normalized === "title" ||
    normalized === "subtitle" ||
    normalized === "body" ||
    normalized === "caption" ||
    normalized === "locked"
  ) {
    return normalized;
  }
  return null;
};

export const toGroupKey = (group?: string | null): string =>
  `${GROUP_KEY_PREFIX}${(group || DEFAULT_LAYOUT_GROUP).trim() || DEFAULT_LAYOUT_GROUP}`;

const cssEscape = (value: string): string => {
  const globalCss = globalThis as unknown as {
    CSS?: { escape?: (input: string) => string };
  };
  if (globalCss.CSS?.escape) {
    return globalCss.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
};

const inferRole = (
  element: HTMLElement,
  path: string,
  fallbackRole?: LayoutTextRole | null
): LayoutTextRole => {
  if (fallbackRole) return fallbackRole;

  const sourceTag = (element.dataset.layoutSourceTag || element.tagName).toLowerCase();
  const className = (element.className || "").toLowerCase();
  const normalizedPath = path.toLowerCase();

  if (
    sourceTag === "h1" ||
    sourceTag === "h2" ||
    /\b(title|heading|headline|hero_title|maintitle|titleprefix)\b/.test(
      normalizedPath
    )
  ) {
    return "title";
  }

  if (
    sourceTag === "h3" ||
    /\b(subtitle|subheading|tagline|kicker)\b/.test(normalizedPath)
  ) {
    return "subtitle";
  }

  if (
    /\b(caption|footnote|label)\b/.test(normalizedPath) ||
    /\bcaption\b/.test(className)
  ) {
    return "caption";
  }

  if (/\b(title|heading)\b/.test(className)) {
    return "title";
  }

  return "body";
};

const getRole = (element: HTMLElement, path: string): LayoutTextRole =>
  inferRole(element, path, normalizeRole(element.dataset.layoutRole));

const isAdaptiveRole = (role: LayoutTextRole): boolean => ADAPTIVE_ROLES.has(role);

const getGroupKey = (element: HTMLElement, role: LayoutTextRole): string | null => {
  if (!isAdaptiveRole(role)) return null;
  return toGroupKey(element.dataset.layoutGroup);
};

const waitForStableLayout = async (): Promise<void> => {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      // no-op
    }
  }

  const images = Array.from(document.images);
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          const onDone = () => resolve();
          img.addEventListener("load", onDone, { once: true });
          img.addEventListener("error", onDone, { once: true });
        });
      }

      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          // ignore decode failures
        }
      }
    })
  );

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};

const setBaseFontSizeIfMissing = (element: HTMLElement): number | null => {
  const stored = element.dataset.layoutBaseFontSize;
  if (stored) {
    const parsed = Number.parseFloat(stored);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const computed = Number.parseFloat(window.getComputedStyle(element).fontSize);
  if (!Number.isFinite(computed) || computed <= 0) {
    return null;
  }
  element.dataset.layoutBaseFontSize = String(computed);
  return computed;
};

const applyBlocksToSlide = (
  slideRoot: HTMLElement,
  groups: Record<string, LayoutValidationBlock>
): void => {
  const textNodes = Array.from(
    slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
  );

  for (const textNode of textNodes) {
    const path = textNode.dataset.layoutPath || "";
    const baseSize = setBaseFontSizeIfMissing(textNode);
    const role = getRole(textNode, path);
    const groupKey = getGroupKey(textNode, role);

    if (!baseSize) continue;

    if (!groupKey) {
      textNode.style.fontSize = `${baseSize}px`;
      continue;
    }

    const scale = groups[groupKey]?.fontScale;
    if (!scale || scale >= 1) {
      textNode.style.fontSize = `${baseSize}px`;
      continue;
    }

    const nextSize = Math.max(8, baseSize * scale);
    textNode.style.fontSize = `${nextSize}px`;
  }
};

const isClippedByAncestor = (
  element: HTMLElement,
  slideRoot: HTMLElement
): boolean => {
  const rect = element.getBoundingClientRect();
  let parent: HTMLElement | null = element.parentElement;

  while (parent && parent !== slideRoot) {
    const styles = window.getComputedStyle(parent);
    const overflowX = styles.overflowX || styles.overflow;
    const overflowY = styles.overflowY || styles.overflow;

    if (CLIPPING_VALUES.has(overflowX) || CLIPPING_VALUES.has(overflowY)) {
      const parentRect = parent.getBoundingClientRect();
      if (
        rect.left < parentRect.left - 1 ||
        rect.top < parentRect.top - 1 ||
        rect.right > parentRect.right + 1 ||
        rect.bottom > parentRect.bottom + 1
      ) {
        return true;
      }
    }

    parent = parent.parentElement;
  }

  return false;
};

const collectIssues = (
  slideRoot: HTMLElement,
  slideIndex: number
): { issues: LayoutValidationIssue[]; densityByPath: Record<string, number> } => {
  const slideRect = slideRoot.getBoundingClientRect();
  const textNodes = Array.from(
    slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
  );
  const seen = new Set<string>();
  const issues: LayoutValidationIssue[] = [];
  const densityByPath: Record<string, number> = {};

  for (const [index, textNode] of textNodes.entries()) {
    const path = textNode.dataset.layoutPath || `__dom_${index}`;
    const role = getRole(textNode, path);
    const groupKey = getGroupKey(textNode, role) || undefined;

    const rect = textNode.getBoundingClientRect();
    const hasScrollOverflow =
      textNode.scrollHeight - textNode.clientHeight > 1 ||
      textNode.scrollWidth - textNode.clientWidth > 1;
    const density =
      textNode.clientHeight > 0 ? textNode.scrollHeight / textNode.clientHeight : 0;
    densityByPath[path] = Number.isFinite(density)
      ? Number(density.toFixed(3))
      : 0;

    const clippedByAncestor = isClippedByAncestor(textNode, slideRoot);
    const outOfBounds =
      rect.left < slideRect.left - 1 ||
      rect.top < slideRect.top - 1 ||
      rect.right > slideRect.right + 1 ||
      rect.bottom > slideRect.bottom + 1;

    if (hasScrollOverflow || clippedByAncestor) {
      const key = `overflow:${path}`;
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          type: "overflow",
          path,
          slideIndex,
          role,
          groupKey,
          density: densityByPath[path],
          message: hasScrollOverflow
            ? "Text overflows its own container."
            : "Text is clipped by an ancestor container.",
        });
      }
    }

    if (outOfBounds) {
      const key = `out_of_bounds:${path}`;
      if (!seen.has(key)) {
        seen.add(key);
        issues.push({
          type: "out_of_bounds",
          path,
          slideIndex,
          role,
          groupKey,
          density: densityByPath[path],
          message: "Text bounds exceed slide bounds.",
        });
      }
    }
  }

  return {
    issues,
    densityByPath,
  };
};

const getLineHeight = (element: HTMLElement): number => {
  const computed = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computed.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight;
  const fontSize = Number.parseFloat(computed.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) return fontSize * 1.25;
  return 16;
};

const applyClampFallback = (
  slideRoot: HTMLElement,
  unresolvedIssues: LayoutValidationIssue[]
): string[] => {
  const clampedPaths: string[] = [];
  const uniqueAdaptivePaths = Array.from(
    new Set(
      unresolvedIssues
        .filter((issue) => isAdaptiveRole(issue.role))
        .map((issue) => issue.path)
    )
  );

  for (const path of uniqueAdaptivePaths) {
    const node = slideRoot.querySelector<HTMLElement>(
      `[data-layout-path="${cssEscape(path)}"]`
    );
    if (!node) continue;

    const lineHeight = getLineHeight(node);
    const maxLines = Math.max(1, Math.floor(node.clientHeight / lineHeight));
    node.style.display = "-webkit-box";
    (node.style as CSSStyleDeclaration & { webkitBoxOrient?: string }).webkitBoxOrient =
      "vertical";
    (node.style as CSSStyleDeclaration & { webkitLineClamp?: string }).webkitLineClamp =
      String(maxLines);
    node.style.overflow = "hidden";
    node.style.wordBreak = "break-word";
    node.dataset.layoutClamped = "true";
    clampedPaths.push(path);
  }

  return clampedPaths;
};

const normalizeIncomingGroups = (
  initialBlocks: Record<string, LayoutValidationBlock>
): Record<string, LayoutValidationBlock> => {
  const normalized: Record<string, LayoutValidationBlock> = {};

  for (const [key, value] of Object.entries(initialBlocks || {})) {
    if (!value?.fontScale || value.fontScale <= 0) continue;
    if (key.startsWith(GROUP_KEY_PREFIX)) {
      normalized[key] = { fontScale: value.fontScale };
    }
  }

  const defaultGroupKey = toGroupKey(DEFAULT_LAYOUT_GROUP);

  const legacyGlobalScale = initialBlocks[LEGACY_GLOBAL_SCALE_KEY]?.fontScale;
  if (
    legacyGlobalScale &&
    legacyGlobalScale > 0 &&
    legacyGlobalScale < 1 &&
    !normalized[defaultGroupKey]
  ) {
    normalized[defaultGroupKey] = { fontScale: legacyGlobalScale };
  }

  const legacyPathScales = Object.entries(initialBlocks)
    .filter(
      ([key, value]) =>
        key !== LEGACY_GLOBAL_SCALE_KEY &&
        !key.startsWith(GROUP_KEY_PREFIX) &&
        !!value?.fontScale &&
        (value.fontScale as number) > 0 &&
        (value.fontScale as number) < 1
    )
    .map(([, value]) => value.fontScale as number);

  if (legacyPathScales.length > 0 && !normalized[defaultGroupKey]) {
    normalized[defaultGroupKey] = {
      fontScale: Math.min(...legacyPathScales),
    };
  }

  return normalized;
};

export const validateAndAutoFixSlideElement = async (
  slideRoot: HTMLElement,
  initialBlocks: Record<string, LayoutValidationBlock> = {},
  options: ValidateOptions = {}
): Promise<LayoutValidationResult> => {
  const maxIterations = options.maxIterations ?? 6;
  const minScale = options.minScale ?? 0.6;
  const scaleStep = options.scaleStep ?? 0.92;
  const slideIndex = options.slideIndex ?? 0;
  const clampOnFail = options.clampOnFail ?? false;

  const groups: Record<string, LayoutValidationBlock> =
    normalizeIncomingGroups(initialBlocks);

  const appliedFixes: Array<{
    path: string;
    previousScale: number;
    nextScale: number;
  }> = [];
  let clampedPaths: string[] = [];

  await waitForStableLayout();
  applyBlocksToSlide(slideRoot, groups);
  await waitForStableLayout();

  let { issues, densityByPath } = collectIssues(slideRoot, slideIndex);

  for (
    let iteration = 0;
    iteration < maxIterations && issues.length > 0;
    iteration += 1
  ) {
    const adaptiveIssues = issues.filter((issue) => isAdaptiveRole(issue.role));
    if (adaptiveIssues.length === 0) {
      break;
    }

    const touchedGroups = new Set(
      adaptiveIssues.map((issue) => issue.groupKey).filter(Boolean) as string[]
    );
    let appliedInIteration = false;

    for (const groupKey of touchedGroups) {
      const previousScale = groups[groupKey]?.fontScale ?? 1;
      const nextScale = Math.max(
        minScale,
        Number((previousScale * scaleStep).toFixed(3))
      );

      if (nextScale < previousScale) {
        groups[groupKey] = {
          ...groups[groupKey],
          fontScale: nextScale,
        };
        appliedFixes.push({
          path: groupKey,
          previousScale,
          nextScale,
        });
        appliedInIteration = true;
      }
    }

    if (!appliedInIteration) {
      break;
    }

    applyBlocksToSlide(slideRoot, groups);
    await waitForStableLayout();
    ({ issues, densityByPath } = collectIssues(slideRoot, slideIndex));
  }

  if (issues.length > 0 && clampOnFail) {
    clampedPaths = applyClampFallback(slideRoot, issues);
    if (clampedPaths.length > 0) {
      await waitForStableLayout();
      ({ issues, densityByPath } = collectIssues(slideRoot, slideIndex));
    }
  }

  const unresolvedIssues = issues;
  const status: "ok" | "fixed" | "failed" =
    unresolvedIssues.length > 0
      ? "failed"
      : appliedFixes.length > 0
        ? "fixed"
        : "ok";

  const maxDensity = Object.values(densityByPath).reduce(
    (max, current) => Math.max(max, current),
    0
  );

  return {
    status,
    groups,
    blocks: groups,
    issues: unresolvedIssues,
    unresolvedIssues,
    appliedFixes,
    clampedPaths,
    density: {
      maxDensity: Number(maxDensity.toFixed(3)),
      byPath: densityByPath,
    },
  };
};
