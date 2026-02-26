"use client";

export type LayoutIssueType = "overflow" | "out_of_bounds";

export interface LayoutValidationIssue {
  type: LayoutIssueType;
  path: string;
  message: string;
  slideIndex: number;
}

export interface LayoutValidationBlock {
  fontScale?: number;
}

export interface LayoutValidationResult {
  status: "ok" | "fixed" | "failed";
  blocks: Record<string, LayoutValidationBlock>;
  issues: LayoutValidationIssue[];
  unresolvedIssues: LayoutValidationIssue[];
  appliedFixes: Array<{
    path: string;
    previousScale: number;
    nextScale: number;
  }>;
}

interface ValidateOptions {
  maxIterations?: number;
  minScale?: number;
  scaleStep?: number;
  slideIndex?: number;
}

const CLIPPING_VALUES = new Set(["hidden", "clip", "auto", "scroll"]);
const GLOBAL_SCALE_KEY = "__all__";

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
  blocks: Record<string, LayoutValidationBlock>
): void => {
  const globalScale = blocks[GLOBAL_SCALE_KEY]?.fontScale;
  const textNodes = Array.from(
    slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
  );

  for (const textNode of textNodes) {
    const path = textNode.dataset.layoutPath || "";

    const scale = globalScale ?? blocks[path]?.fontScale;
    if (!scale || scale >= 1) continue;

    const baseSize = setBaseFontSizeIfMissing(textNode);
    if (!baseSize) continue;

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
): LayoutValidationIssue[] => {
  const slideRect = slideRoot.getBoundingClientRect();
  const textNodes = Array.from(
    slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
  );
  const seen = new Set<string>();
  const issues: LayoutValidationIssue[] = [];

  for (const [index, textNode] of textNodes.entries()) {
    const path = textNode.dataset.layoutPath || `__dom_${index}`;

    const rect = textNode.getBoundingClientRect();
    const hasScrollOverflow =
      textNode.scrollHeight - textNode.clientHeight > 1 ||
      textNode.scrollWidth - textNode.clientWidth > 1;

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
          message: "Text bounds exceed slide bounds.",
        });
      }
    }
  }

  return issues;
};

export const validateAndAutoFixSlideElement = async (
  slideRoot: HTMLElement,
  initialBlocks: Record<string, LayoutValidationBlock> = {},
  options: ValidateOptions = {}
): Promise<LayoutValidationResult> => {
  const maxIterations = options.maxIterations ?? 2;
  const minScale = options.minScale ?? 0.72;
  const scaleStep = options.scaleStep ?? 0.92;
  const slideIndex = options.slideIndex ?? 0;

  const blocks: Record<string, LayoutValidationBlock> = { ...initialBlocks };
  const legacyPathScales = Object.entries(initialBlocks)
    .filter(
      ([key, value]) =>
        key !== GLOBAL_SCALE_KEY &&
        !!value?.fontScale &&
        (value.fontScale as number) > 0 &&
        (value.fontScale as number) < 1
    )
    .map(([, value]) => value.fontScale as number);
  const initialGlobalScale =
    blocks[GLOBAL_SCALE_KEY]?.fontScale ??
    (legacyPathScales.length > 0 ? Math.min(...legacyPathScales) : 1);
  blocks[GLOBAL_SCALE_KEY] = {
    fontScale: initialGlobalScale,
  };

  const appliedFixes: Array<{
    path: string;
    previousScale: number;
    nextScale: number;
  }> = [];

  await waitForStableLayout();
  applyBlocksToSlide(slideRoot, blocks);
  await waitForStableLayout();

  let issues = collectIssues(slideRoot, slideIndex);

  for (
    let iteration = 0;
    iteration < maxIterations && issues.length > 0;
    iteration += 1
  ) {
    const previousScale = blocks[GLOBAL_SCALE_KEY]?.fontScale ?? 1;
    const nextScale = Math.max(
      minScale,
      Number((previousScale * scaleStep).toFixed(3))
    );

    if (nextScale < previousScale) {
      blocks[GLOBAL_SCALE_KEY] = {
        ...blocks[GLOBAL_SCALE_KEY],
        fontScale: nextScale,
      };
      appliedFixes.push({
        path: GLOBAL_SCALE_KEY,
        previousScale,
        nextScale,
      });
    }

    applyBlocksToSlide(slideRoot, blocks);
    await waitForStableLayout();
    issues = collectIssues(slideRoot, slideIndex);
  }

  const unresolvedIssues = issues;
  const status: "ok" | "fixed" | "failed" =
    unresolvedIssues.length > 0
      ? "failed"
      : appliedFixes.length > 0
        ? "fixed"
        : "ok";

  return {
    status,
    blocks,
    issues: unresolvedIssues,
    unresolvedIssues,
    appliedFixes,
  };
};
