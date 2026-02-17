import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";

import { sanitizeFilename } from "@/app/(presentation-generator)/utils/others";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const extractAuth = () => {
    const authorization = req.headers.get("authorization");
    const headerApiKey = req.headers.get("x-api-key");
    const queryToken = req.nextUrl.searchParams.get("token");
    const queryApiKey = req.nextUrl.searchParams.get("api_key");
    const queryFont = req.nextUrl.searchParams.get("font");
    const cookieToken = req.cookies.get("auth_token")?.value;

    let token: string | null = null;
    if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
      token = authorization.split(" ", 2)[1] || null;
    }
    token = token || queryToken || cookieToken || null;

    return {
      token,
      apiKey: headerApiKey || queryApiKey || null,
      font: queryFont || null,
    };
  };

  const { id, title } = await req.json();
  if (!id) {
    return NextResponse.json(
      { error: "Missing Presentation ID" },
      { status: 400 }
    );
  }

  const { token, apiKey, font } = extractAuth();
  const browser = await puppeteer.launch({
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
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.setDefaultNavigationTimeout(300000);
  page.setDefaultTimeout(300000);

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

  const baseUrl = process.env.NEXTJS_API_URL || "http://localhost:3000";
  const pdfMakerParams = new URLSearchParams({ id: String(id) });
  if (token) {
    pdfMakerParams.set("token", token);
  }
  if (apiKey) {
    pdfMakerParams.set("api_key", apiKey);
  }
  if (font) {
    pdfMakerParams.set("font", font);
  }
  const pdfMakerUrl = `${baseUrl}/pdf-maker?${pdfMakerParams.toString()}`;
  console.log(`Navigating to: ${baseUrl}/pdf-maker?id=${id}`);

  await page.goto(pdfMakerUrl, {
    // /pdf-maker can keep background requests alive; explicit readiness checks are more reliable.
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.waitForFunction('() => document.readyState === "complete"');

  try {
    console.log("Waiting for slides to load...");
    await page.waitForSelector("#presentation-slides-wrapper > div > div", {
      timeout: 60000,
    });

    await page.waitForFunction(
      `
      () => {
        const wrapper = document.querySelector('#presentation-slides-wrapper');
        if (!wrapper) return false;
        const slides = wrapper.querySelectorAll(':scope > div > div');
        const skeletons = wrapper.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]');
        return slides.length > 0 && skeletons.length === 0;
      }
      `,
      { timeout: 60000 }
    );

    // Wait until markdown replacement is complete for all rendered text blocks.
    await page.waitForFunction(
      `
      () => {
        const replacers = Array.from(document.querySelectorAll('.tiptap-text-replacer'));
        if (replacers.length === 0) return true;
        return replacers.every((el) => el.getAttribute('data-tiptap-processed') === 'true');
      }
      `,
      { timeout: 30000 }
    );

    // Ensure web fonts are loaded before snapshotting to PDF.
    await page.waitForFunction(
      `
      () => {
        if (!document.fonts) return true;
        return document.fonts.status === 'loaded';
      }
      `,
      { timeout: 30000 }
    );

    console.log("Slides loaded.");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.log("Warning: Some content may not have loaded completely (timeout):", error);
  }

  const pdfBuffer = await page.pdf({
    width: "1280px",
    height: "720px",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  browser.close();

  const sanitizedTitle = sanitizeFilename(title ?? "presentation");
  const appDataDirectory = process.env.APP_DATA_DIRECTORY || "./app_data";
  const destinationPath = path.join(
    appDataDirectory,
    "exports",
    `${sanitizedTitle}.pdf`
  );
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.promises.writeFile(destinationPath, pdfBuffer);

  return NextResponse.json({
    success: true,
    path: destinationPath,
  });
}
