import fs from "fs";
import path from "path";
import { Page } from "puppeteer";
import { ApiError } from "@/models/errors";

type LayoutTextRole = "title" | "subtitle" | "body" | "caption" | "locked";

export interface ExportLayoutValidationIssue {
  type: "overflow" | "out_of_bounds";
  path: string;
  slideIndex: number;
  slideId?: string;
  message: string;
  role: LayoutTextRole;
  groupKey?: string;
  density?: number;
}

export interface ExportLayoutValidationResult {
  iterations: number;
  issues: ExportLayoutValidationIssue[];
  unresolvedIssues: ExportLayoutValidationIssue[];
  appliedFixes: Array<{
    slideIndex: number;
    path: string;
    previousScale: number;
    nextScale: number;
  }>;
  overrides: Record<string, Record<string, { fontScale: number }>>;
  clampedPaths: Array<{ slideIndex: number; path: string }>;
  reflow: {
    attempted: boolean;
    succeeded: boolean;
    updatedNodes: number;
  };
  density: {
    maxDensity: number;
    bySlide: Record<string, number>;
  };
  issuesReportPath?: string;
  screenshotPath?: string;
}

interface RunLayoutValidationOptions {
  page: Page;
  presentationId: string;
  mode: "pdf" | "pptx";
  authToken?: string | null;
  apiKey?: string | null;
  maxIterations?: number;
  minScale?: number;
  scaleStep?: number;
  clampOnFail?: boolean;
  enableLlmReflow?: boolean;
  failOnUnresolved?: boolean;
}

interface InPageValidationResult {
  iterations: number;
  issues: ExportLayoutValidationIssue[];
  unresolvedIssues: ExportLayoutValidationIssue[];
  appliedFixes: Array<{
    slideIndex: number;
    path: string;
    previousScale: number;
    nextScale: number;
  }>;
  overrides: Record<string, Record<string, { fontScale: number }>>;
  density: {
    maxDensity: number;
    bySlide: Record<string, number>;
  };
}

const DEFAULT_LAYOUT_GROUP = "body";
const GROUP_KEY_PREFIX = "group:";
const LEGACY_GLOBAL_SCALE_KEY = "__all__";

const isAdaptiveRole = (role: LayoutTextRole): boolean =>
  role === "body" || role === "caption";

const runLayoutValidationInPage = async (
  page: Page,
  options: {
    maxIterations: number;
    minScale: number;
    scaleStep: number;
    initialOverrides?: Record<string, Record<string, { fontScale: number }>>;
  }
): Promise<InPageValidationResult> => {
  return await page.evaluate(
    async ({
      maxIterations: localMaxIterations,
      minScale,
      scaleStep,
      initialOverrides = {},
    }) => {
      type LocalRole = "title" | "subtitle" | "body" | "caption" | "locked";
      type LocalIssue = {
        type: "overflow" | "out_of_bounds";
        path: string;
        slideIndex: number;
        slideId?: string;
        message: string;
        role: LocalRole;
        groupKey?: string;
        density?: number;
      };

      type LocalFix = {
        slideIndex: number;
        path: string;
        previousScale: number;
        nextScale: number;
      };

      const CLIPPING_VALUES = new Set(["hidden", "clip", "auto", "scroll"]);
      const DEFAULT_GROUP = "body";
      const GROUP_PREFIX = "group:";
      const LEGACY_GLOBAL_KEY = "__all__";
      const ADAPTIVE_ROLES = new Set<LocalRole>(["body", "caption"]);

      const normalizeRole = (rawRole?: string | null): LocalRole | null => {
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

      const toGroupKey = (group?: string | null): string =>
        `${GROUP_PREFIX}${(group || DEFAULT_GROUP).trim() || DEFAULT_GROUP}`;

      const inferRole = (element: HTMLElement, path: string): LocalRole => {
        const explicitRole = normalizeRole(element.dataset.layoutRole);
        if (explicitRole) return explicitRole;

        const sourceTag = (
          element.dataset.layoutSourceTag || element.tagName
        ).toLowerCase();
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

      const getGroupKey = (element: HTMLElement, role: LocalRole): string | null => {
        if (!ADAPTIVE_ROLES.has(role)) return null;
        return toGroupKey(element.dataset.layoutGroup);
      };

      const waitForStableLayout = async () => {
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

      const disableAnimations = () => {
        const styleId = "presenton-layout-validation-disable-anim";
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent =
          "*, *::before, *::after { animation: none !important; transition: none !important; }";
        document.head.appendChild(style);
      };

      const getSlides = (): HTMLElement[] =>
        Array.from(document.querySelectorAll<HTMLElement>("[data-slide-root]"));

      const setBaseFontSizeIfMissing = (element: HTMLElement): number | null => {
        const stored = element.dataset.layoutBaseFontSize;
        if (stored) {
          const parsed = Number.parseFloat(stored);
          if (Number.isFinite(parsed) && parsed > 0) return parsed;
        }

        const computed = Number.parseFloat(
          window.getComputedStyle(element).fontSize
        );
        if (!Number.isFinite(computed) || computed <= 0) {
          return null;
        }
        element.dataset.layoutBaseFontSize = String(computed);
        return computed;
      };

      const applyScale = (element: HTMLElement, scale: number) => {
        const baseSize = setBaseFontSizeIfMissing(element);
        if (!baseSize) return;

        if (!scale || scale >= 1) {
          element.style.fontSize = `${baseSize}px`;
          return;
        }
        const nextSize = Math.max(8, baseSize * scale);
        element.style.fontSize = `${nextSize}px`;
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

      const collectIssues = (): {
        issues: LocalIssue[];
        density: { maxDensity: number; bySlide: Record<string, number> };
      } => {
        const slides = getSlides();
        const issues: LocalIssue[] = [];
        const seen = new Set<string>();
        const densityBySlide: Record<string, number> = {};

        slides.forEach((slideRoot, fallbackIndex) => {
          const slideIndex = Number.parseInt(
            slideRoot.dataset.slideIndex || String(fallbackIndex),
            10
          );
          const slideId = slideRoot.dataset.slideId;
          const slideRect = slideRoot.getBoundingClientRect();
          const textNodes = Array.from(
            slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
          );

          let slideMaxDensity = 0;
          for (const [textNodeIndex, textNode] of textNodes.entries()) {
            const path = textNode.dataset.layoutPath || `__dom_${textNodeIndex}`;
            const role = inferRole(textNode, path);
            const groupKey = getGroupKey(textNode, role) || undefined;

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
            const density =
              textNode.clientHeight > 0
                ? Number((textNode.scrollHeight / textNode.clientHeight).toFixed(3))
                : 0;
            slideMaxDensity = Math.max(slideMaxDensity, density);

            if (hasScrollOverflow || clippedByAncestor) {
              const key = `overflow:${slideIndex}:${path}`;
              if (!seen.has(key)) {
                seen.add(key);
                issues.push({
                  type: "overflow",
                  path,
                  slideIndex,
                  slideId,
                  role,
                  groupKey,
                  density,
                  message: hasScrollOverflow
                    ? "Text overflows its own container."
                    : "Text is clipped by an ancestor container.",
                });
              }
            }

            if (outOfBounds) {
              const key = `out_of_bounds:${slideIndex}:${path}`;
              if (!seen.has(key)) {
                seen.add(key);
                issues.push({
                  type: "out_of_bounds",
                  path,
                  slideIndex,
                  slideId,
                  role,
                  groupKey,
                  density,
                  message: "Text bounds exceed slide bounds.",
                });
              }
            }
          }

          densityBySlide[String(slideIndex)] = Number(slideMaxDensity.toFixed(3));
        });

        const maxDensity = Object.values(densityBySlide).reduce(
          (max, current) => Math.max(max, current),
          0
        );

        return {
          issues,
          density: {
            maxDensity: Number(maxDensity.toFixed(3)),
            bySlide: densityBySlide,
          },
        };
      };

      const normalizeInitialOverrides = (
        raw: Record<string, Record<string, { fontScale: number }>>
      ): Record<string, Record<string, { fontScale: number }>> => {
        const normalized: Record<string, Record<string, { fontScale: number }>> = {};

        for (const [slideKey, groups] of Object.entries(raw || {})) {
          normalized[slideKey] = {};
          for (const [groupKey, value] of Object.entries(groups || {})) {
            if (!value?.fontScale || value.fontScale <= 0) continue;
            normalized[slideKey][groupKey] = { fontScale: value.fontScale };
          }

          const defaultGroupKey = toGroupKey(DEFAULT_GROUP);
          const legacyScale = groups?.[LEGACY_GLOBAL_KEY]?.fontScale;
          if (
            legacyScale &&
            legacyScale > 0 &&
            legacyScale < 1 &&
            !normalized[slideKey][defaultGroupKey]
          ) {
            normalized[slideKey][defaultGroupKey] = { fontScale: legacyScale };
          }
        }

        return normalized;
      };

      const applyOverrides = (
        overrides: Record<string, Record<string, { fontScale: number }>>
      ) => {
        const slides = getSlides();
        slides.forEach((slideRoot, fallbackIndex) => {
          const slideIndex = Number.parseInt(
            slideRoot.dataset.slideIndex || String(fallbackIndex),
            10
          );
          const slideOverrides = overrides[String(slideIndex)] || {};
          const textNodes = Array.from(
            slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
          );

          textNodes.forEach((textNode, textNodeIndex) => {
            const path = textNode.dataset.layoutPath || `__dom_${textNodeIndex}`;
            const role = inferRole(textNode, path);
            const groupKey = getGroupKey(textNode, role);
            if (!groupKey) {
              applyScale(textNode, 1);
              return;
            }
            const scale = slideOverrides[groupKey]?.fontScale ?? 1;
            applyScale(textNode, scale);
          });
        });
      };

      disableAnimations();
      await waitForStableLayout();

      const overrides = normalizeInitialOverrides(initialOverrides);
      const appliedFixes: LocalFix[] = [];

      applyOverrides(overrides);
      await waitForStableLayout();

      let issuesResult = collectIssues();
      let issues = issuesResult.issues;
      let density = issuesResult.density;
      let iterations = 0;

      for (
        let attempt = 0;
        attempt < localMaxIterations && issues.length > 0;
        attempt += 1
      ) {
        iterations += 1;
        const adaptiveIssues = issues.filter((issue) =>
          ADAPTIVE_ROLES.has(issue.role)
        );
        if (adaptiveIssues.length === 0) {
          break;
        }

        let appliedInIteration = false;
        const touched = new Set<string>();
        for (const issue of adaptiveIssues) {
          if (!issue.groupKey) continue;
          const key = `${issue.slideIndex}:${issue.groupKey}`;
          if (touched.has(key)) continue;
          touched.add(key);

          const slideKey = String(issue.slideIndex);
          if (!overrides[slideKey]) overrides[slideKey] = {};
          const previousScale = overrides[slideKey][issue.groupKey]?.fontScale ?? 1;
          const nextScale = Math.max(
            minScale,
            Number((previousScale * scaleStep).toFixed(3))
          );

          if (nextScale < previousScale) {
            overrides[slideKey][issue.groupKey] = { fontScale: nextScale };
            appliedFixes.push({
              slideIndex: issue.slideIndex,
              path: issue.groupKey,
              previousScale,
              nextScale,
            });
            appliedInIteration = true;
          }
        }

        if (!appliedInIteration) {
          break;
        }

        applyOverrides(overrides);
        await waitForStableLayout();
        issuesResult = collectIssues();
        issues = issuesResult.issues;
        density = issuesResult.density;
      }

      return {
        iterations,
        issues,
        unresolvedIssues: issues,
        appliedFixes,
        overrides,
        density,
      };
    },
    options
  );
};

const applyDomTextUpdates = async (
  page: Page,
  updatesBySlide: Array<{
    slideId: string;
    updates: Array<{ path: string; text: string }>;
  }>
): Promise<number> => {
  if (updatesBySlide.length === 0) return 0;

  const updatedCount = await page.evaluate((updates) => {
    const cssEscape = (value: string): string => {
      const globalCss = globalThis as unknown as {
        CSS?: { escape?: (input: string) => string };
      };
      if (globalCss.CSS?.escape) {
        return globalCss.CSS.escape(value);
      }
      return value.replace(/["\\]/g, "\\$&");
    };

    let applied = 0;
    for (const slide of updates) {
      const slideRoot = document.querySelector<HTMLElement>(
        `[data-slide-id="${cssEscape(slide.slideId)}"]`
      );
      if (!slideRoot) continue;
      for (const patch of slide.updates) {
        const node = slideRoot.querySelector<HTMLElement>(
          `[data-layout-path="${cssEscape(patch.path)}"]`
        );
        if (!node) continue;
        const target = node.querySelector<HTMLElement>(".ProseMirror") || node;
        target.textContent = patch.text;
        applied += 1;
      }
    }
    return applied;
  }, updatesBySlide);

  return updatedCount;
};

const applyClampFallbackInPage = async (
  page: Page,
  unresolvedIssues: ExportLayoutValidationIssue[]
): Promise<Array<{ slideIndex: number; path: string }>> => {
  if (unresolvedIssues.length === 0) return [];

  return await page.evaluate((issues) => {
    const cssEscape = (value: string): string => {
      const globalCss = globalThis as unknown as {
        CSS?: { escape?: (input: string) => string };
      };
      if (globalCss.CSS?.escape) {
        return globalCss.CSS.escape(value);
      }
      return value.replace(/["\\]/g, "\\$&");
    };

    const adaptive = new Set(["body", "caption"]);
    const unique = new Set<string>();
    const clamped: Array<{ slideIndex: number; path: string }> = [];

    for (const issue of issues) {
      if (!adaptive.has(issue.role)) continue;
      const key = `${issue.slideIndex}:${issue.path}`;
      if (unique.has(key)) continue;
      unique.add(key);

      const slideRoot = document.querySelector<HTMLElement>(
        `[data-slide-index="${issue.slideIndex}"]`
      );
      if (!slideRoot) continue;
      const node = slideRoot.querySelector<HTMLElement>(
        `[data-layout-path="${cssEscape(issue.path)}"]`
      );
      if (!node) continue;

      const computed = window.getComputedStyle(node);
      const lineHeight =
        Number.parseFloat(computed.lineHeight) ||
        Number.parseFloat(computed.fontSize) * 1.25 ||
        16;
      const maxLines = Math.max(1, Math.floor(node.clientHeight / lineHeight));

      node.style.display = "-webkit-box";
      (node.style as CSSStyleDeclaration & { webkitBoxOrient?: string }).webkitBoxOrient =
        "vertical";
      (node.style as CSSStyleDeclaration & { webkitLineClamp?: string }).webkitLineClamp =
        String(maxLines);
      node.style.overflow = "hidden";
      node.style.wordBreak = "break-word";
      node.dataset.layoutClamped = "true";

      clamped.push({ slideIndex: issue.slideIndex, path: issue.path });
    }

    return clamped;
  }, unresolvedIssues);
};

const fetchLlmReflowPatches = async ({
  issues,
  authToken,
  apiKey,
}: {
  issues: ExportLayoutValidationIssue[];
  authToken?: string | null;
  apiKey?: string | null;
}): Promise<Array<{ slideId: string; updates: Array<{ path: string; text: string }> }>> => {
  const backendBaseUrl =
    process.env.NEXT_INTERNAL_API_URL || "http://backend:8000";
  const bySlide = new Map<string, Set<string>>();

  for (const issue of issues) {
    if (!issue.slideId) continue;
    if (issue.path.startsWith("__dom_")) continue;
    const paths = bySlide.get(issue.slideId) || new Set<string>();
    paths.add(issue.path);
    bySlide.set(issue.slideId, paths);
  }

  const allPatches: Array<{
    slideId: string;
    updates: Array<{ path: string; text: string }>;
  }> = [];

  for (const [slideId, paths] of bySlide.entries()) {
    if (paths.size === 0) continue;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(`${backendBaseUrl}/api/v1/ppt/slide/layout-reflow`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        slide_id: slideId,
        paths: Array.from(paths),
        max_words: 18,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(
        `Layout reflow skipped for slide ${slideId}: ${response.status} ${text}`
      );
      continue;
    }

    const payload = (await response.json()) as {
      updates?: Array<{ path: string; text: string }>;
    };
    const updates = (payload.updates || []).filter(
      (item) => typeof item.path === "string" && typeof item.text === "string"
    );
    if (updates.length > 0) {
      allPatches.push({
        slideId,
        updates,
      });
    }
  }

  return allPatches;
};

const persistLayoutValidationArtifacts = async (
  page: Page,
  presentationId: string,
  mode: "pdf" | "pptx",
  result: ExportLayoutValidationResult
): Promise<Pick<ExportLayoutValidationResult, "issuesReportPath" | "screenshotPath">> => {
  const appDataDirectory = process.env.APP_DATA_DIRECTORY || "./app_data";
  const debugDir = path.join(
    appDataDirectory,
    "exports",
    "layout_debug",
    presentationId
  );
  await fs.promises.mkdir(debugDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const issuesReportPath = path.join(
    debugDir,
    `${mode}_layout_issues_${timestamp}.json`
  );

  await fs.promises.writeFile(
    issuesReportPath,
    JSON.stringify(
      {
        presentationId,
        mode,
        createdAt: new Date().toISOString(),
        ...result,
      },
      null,
      2
    ),
    "utf-8"
  );

  let screenshotPath: string | undefined;
  if (result.unresolvedIssues.length > 0) {
    screenshotPath = path.join(
      debugDir,
      `${mode}_layout_unresolved_${timestamp}.png`
    );
    await page.screenshot({
      path: screenshotPath as `${string}.png`,
      fullPage: true,
    });
  }

  return {
    issuesReportPath,
    screenshotPath,
  };
};

export const runAndPersistLayoutValidation = async ({
  page,
  presentationId,
  mode,
  authToken,
  apiKey,
  maxIterations = 8,
  minScale = 0.55,
  scaleStep = 0.92,
  clampOnFail = true,
  enableLlmReflow = true,
  failOnUnresolved = false,
}: RunLayoutValidationOptions): Promise<ExportLayoutValidationResult> => {
  let result = await runLayoutValidationInPage(page, {
    maxIterations,
    minScale,
    scaleStep,
  });

  const reflow = {
    attempted: false,
    succeeded: false,
    updatedNodes: 0,
  };
  let clampedPaths: Array<{ slideIndex: number; path: string }> = [];

  if (enableLlmReflow && result.unresolvedIssues.length > 0) {
    reflow.attempted = true;
    try {
      const patches = await fetchLlmReflowPatches({
        issues: result.unresolvedIssues,
        authToken,
        apiKey,
      });
      const updatedNodes = await applyDomTextUpdates(page, patches);
      reflow.updatedNodes = updatedNodes;
      if (updatedNodes > 0) {
        reflow.succeeded = true;
        result = await runLayoutValidationInPage(page, {
          maxIterations,
          minScale,
          scaleStep,
          initialOverrides: result.overrides,
        });
      }
    } catch (error) {
      console.warn("Layout LLM reflow failed:", error);
    }
  }

  if (clampOnFail && result.unresolvedIssues.length > 0) {
    clampedPaths = await applyClampFallbackInPage(page, result.unresolvedIssues);
    if (clampedPaths.length > 0) {
      result = await runLayoutValidationInPage(page, {
        maxIterations: 1,
        minScale,
        scaleStep,
        initialOverrides: result.overrides,
      });
    }
  }

  const finalResult: ExportLayoutValidationResult = {
    ...result,
    clampedPaths,
    reflow,
  };

  const artifacts = await persistLayoutValidationArtifacts(
    page,
    presentationId,
    mode,
    finalResult
  );

  const enrichedResult: ExportLayoutValidationResult = {
    ...finalResult,
    ...artifacts,
  };

  if (enrichedResult.unresolvedIssues.length > 0 && failOnUnresolved) {
    throw new ApiError(
      `Layout validation failed (${mode}). See report: ${enrichedResult.issuesReportPath}`
    );
  }

  return enrichedResult;
};
