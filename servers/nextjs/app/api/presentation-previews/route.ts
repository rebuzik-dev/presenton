import fs from "fs";
import path from "path";

import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVISION_PATTERN = /^[0-9a-f]{64}$/i;
const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const presentationId = String(body?.presentation_id || "");
  const revision = String(body?.revision || "");
  const expectedSlideCount = Number(body?.expected_slide_count);

  if (!UUID_PATTERN.test(presentationId) || !REVISION_PATTERN.test(revision)) {
    return NextResponse.json(
      { detail: "Invalid presentation preview request" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(expectedSlideCount) || expectedSlideCount < 1) {
    return NextResponse.json(
      { detail: "Expected slide count must be a positive integer" },
      { status: 400 },
    );
  }

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      deviceScaleFactor: 1,
    });
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(300000);

    const auth = getRequestAuth(request);
    const baseUrl = (
      process.env.NEXTJS_API_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const params = new URLSearchParams({ id: presentationId });
    if (auth.token) params.set("token", auth.token);
    if (auth.apiKey) params.set("api_key", auth.apiKey);

    await page.goto(`${baseUrl}/pdf-maker?${params.toString()}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("#presentation-slides-wrapper > div > div", {
      timeout: 60000,
    });
    await page.waitForFunction(
      `() => {
        const wrapper = document.querySelector('#presentation-slides-wrapper');
        if (!wrapper) return false;
        const slides = wrapper.querySelectorAll(':scope > div > div');
        const skeletons = wrapper.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]');
        const images = Array.from(wrapper.querySelectorAll('img'));
        const imagesReady = images.every((image) => image.complete);
        const fontsReady = !document.fonts || document.fonts.status === 'loaded';
        const runtimeReady = Array.from(slides).every((slide) => {
          return Boolean(
            slide.querySelector('[data-slide-render-state="ready"]')
          );
        });
        return (
          slides.length > 0 &&
          skeletons.length === 0 &&
          imagesReady &&
          fontsReady &&
          runtimeReady
        );
      }`,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      `() => {
        const replacers = Array.from(document.querySelectorAll('.tiptap-text-replacer'));
        return replacers.length === 0 || replacers.every(
          (element) => element.getAttribute('data-tiptap-processed') === 'true'
        );
      }`,
      { timeout: 30000 },
    );
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "#presentation-slides-wrapper img",
        ),
      );
      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            await new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            });
          }
          if (typeof image.decode === "function") {
            await image.decode().catch(() => undefined);
          }
        }),
      );
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    const slideElements = await page.$$(
      "#presentation-slides-wrapper > div > div",
    );
    if (slideElements.length !== expectedSlideCount) {
      throw new Error(
        `Expected ${expectedSlideCount} slides, rendered ${slideElements.length}`,
      );
    }

    const appDataDirectory = process.env.APP_DATA_DIRECTORY || "./app_data";
    const previewDirectory = path.resolve(
      appDataDirectory,
      "previews",
      presentationId,
    );
    await fs.promises.mkdir(previewDirectory, { recursive: true });

    const slides: Array<{ index: number; filesystem_path: string }> = [];
    const warnings: string[] = [];
    for (const [index, element] of slideElements.entries()) {
      const metrics = await element.evaluate((slide) => {
        const rect = slide.getBoundingClientRect();
        const runtime = slide.querySelector<HTMLElement>("[data-slide-root]");
        const images = Array.from(slide.querySelectorAll<HTMLImageElement>("img"));
        return {
          width: rect.width,
          height: rect.height,
          overflowX: runtime
            ? runtime.scrollWidth > runtime.clientWidth + 1
            : false,
          overflowY: runtime
            ? runtime.scrollHeight > runtime.clientHeight + 1
            : false,
          brokenImages: images.filter(
            (image) => image.complete && image.naturalWidth === 0,
          ).length,
        };
      });
      if (
        Math.abs(metrics.width - SLIDE_WIDTH) > 0.5 ||
        Math.abs(metrics.height - SLIDE_HEIGHT) > 0.5
      ) {
        throw new Error(
          "Slide " + (index + 1) + " rendered at " +
            metrics.width + "x" + metrics.height + "; expected " +
            SLIDE_WIDTH + "x" + SLIDE_HEIGHT,
        );
      }
      if (metrics.overflowX || metrics.overflowY) {
        warnings.push(
          "Slide " + (index + 1) + " contains content outside the " +
            SLIDE_WIDTH + "x" + SLIDE_HEIGHT + " canvas",
        );
      }
      if (metrics.brokenImages > 0) {
        warnings.push(
          "Slide " + (index + 1) + " contains " + metrics.brokenImages +
            " image asset(s) that failed to load",
        );
      }

      const filename = `slide-${index}-${revision.slice(0, 12)}.png`;
      const filesystemPath = path.resolve(previewDirectory, filename);
      if (path.dirname(filesystemPath) !== previewDirectory) {
        throw new Error("Unsafe preview output path");
      }
      await element.screenshot({
        path: filesystemPath as `${string}.png`,
        type: "png",
      });
      slides.push({ index, filesystem_path: filesystemPath });
    }

    return NextResponse.json({
      presentation_id: presentationId,
      revision,
      slides,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { detail: `Failed to render presentation previews: ${message}` },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}

function getRequestAuth(request: NextRequest): {
  token: string | null;
  apiKey: string | null;
} {
  const authorization = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("token");
  const cookieToken = request.cookies.get("auth_token")?.value;
  const token = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.split(" ", 2)[1] || null
    : queryToken || cookieToken || null;

  return {
    token,
    apiKey:
      request.headers.get("x-api-key") ||
      request.nextUrl.searchParams.get("api_key"),
  };
}
