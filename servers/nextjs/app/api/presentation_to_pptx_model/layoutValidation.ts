import fs from "fs";
import path from "path";
import { Page } from "puppeteer";
import { ApiError } from "@/models/errors";

export interface ExportLayoutValidationIssue {
  type: "overflow" | "out_of_bounds";
  path: string;
  slideIndex: number;
  message: string;
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
  overrides: Record<string, { fontScale: number }>;
  issuesReportPath?: string;
  screenshotPath?: string;
}

interface RunLayoutValidationOptions {
  page: Page;
  presentationId: string;
  mode: "pdf" | "pptx";
  maxIterations?: number;
  minScale?: number;
  scaleStep?: number;
  failOnUnresolved?: boolean;
}

const runLayoutValidationInPage = async (
  page: Page,
  options: {
    maxIterations: number;
    minScale: number;
    scaleStep: number;
  }
): Promise<ExportLayoutValidationResult> => {
  return await page.evaluate(
    async ({
      maxIterations: localMaxIterations,
      minScale,
      scaleStep,
    }) => {
      type LocalIssue = {
        type: "overflow" | "out_of_bounds";
        path: string;
        slideIndex: number;
        message: string;
      };
      type LocalFix = {
        slideIndex: number;
        path: string;
        previousScale: number;
        nextScale: number;
      };

      const CLIPPING_VALUES = new Set(["hidden", "clip", "auto", "scroll"]);
      const GLOBAL_SCALE_KEY = "__all__";

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
        if (!scale || scale >= 1) return;
        const baseSize = setBaseFontSizeIfMissing(element);
        if (!baseSize) return;
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

      const collectIssues = (): LocalIssue[] => {
        const slides = getSlides();
        const issues: LocalIssue[] = [];
        const seen = new Set<string>();

        slides.forEach((slideRoot, fallbackIndex) => {
          const slideIndex = Number.parseInt(
            slideRoot.dataset.slideIndex || String(fallbackIndex),
            10
          );
          const slideRect = slideRoot.getBoundingClientRect();
          const textNodes = Array.from(
            slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
          );

          for (const [textNodeIndex, textNode] of textNodes.entries()) {
            const path =
              textNode.dataset.layoutPath || `__dom_${textNodeIndex}`;

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
              const key = `overflow:${slideIndex}:${path}`;
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
              const key = `out_of_bounds:${slideIndex}:${path}`;
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
        });

        return issues;
      };

      const applyOverrides = (overrides: Record<string, { fontScale: number }>) => {
        const slides = getSlides();
        slides.forEach((slideRoot, fallbackIndex) => {
          const slideIndex = Number.parseInt(
            slideRoot.dataset.slideIndex || String(fallbackIndex),
            10
          );
          const scale = overrides[String(slideIndex)]?.fontScale;
          if (!scale || scale >= 1) return;

          const textNodes = Array.from(
            slideRoot.querySelectorAll<HTMLElement>("[data-layout-path]")
          );
          textNodes.forEach((textNode) => {
            applyScale(textNode, scale);
          });
        });
      };

      disableAnimations();
      await waitForStableLayout();

      const overrides: Record<string, { fontScale: number }> = {};
      const appliedFixes: LocalFix[] = [];

      let issues = collectIssues();
      let iterations = 0;

      for (
        let attempt = 0;
        attempt < localMaxIterations && issues.length > 0;
        attempt += 1
      ) {
        iterations += 1;
        const touchedSlides = new Set<number>();

        for (const issue of issues) {
          if (touchedSlides.has(issue.slideIndex)) continue;
          touchedSlides.add(issue.slideIndex);

          const slideKey = String(issue.slideIndex);
          const previousScale = overrides[slideKey]?.fontScale ?? 1;
          const nextScale = Math.max(
            minScale,
            Number((previousScale * scaleStep).toFixed(3))
          );

          if (nextScale < previousScale) {
            overrides[slideKey] = { fontScale: nextScale };
            appliedFixes.push({
              slideIndex: issue.slideIndex,
              path: GLOBAL_SCALE_KEY,
              previousScale,
              nextScale,
            });
          }
        }

        applyOverrides(overrides);
        await waitForStableLayout();
        issues = collectIssues();
      }

      return {
        iterations,
        issues,
        unresolvedIssues: issues,
        appliedFixes,
        overrides,
      };
    },
    options
  );
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
  maxIterations = 8,
  minScale = 0.45,
  scaleStep = 0.9,
  failOnUnresolved = false,
}: RunLayoutValidationOptions): Promise<ExportLayoutValidationResult> => {
  const result = await runLayoutValidationInPage(page, {
    maxIterations,
    minScale,
    scaleStep,
  });
  const artifacts = await persistLayoutValidationArtifacts(
    page,
    presentationId,
    mode,
    result
  );

  const enrichedResult: ExportLayoutValidationResult = {
    ...result,
    ...artifacts,
  };

  if (enrichedResult.unresolvedIssues.length > 0 && failOnUnresolved) {
    throw new ApiError(
      `Layout validation failed (${mode}). See report: ${enrichedResult.issuesReportPath}`
    );
  }

  return enrichedResult;
};
