import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

import {
  buildBuiltinTemplateLayoutPayload,
  buildCustomTemplateLayoutPayloadFromApi,
} from "@/lib/server-template-layouts";

export const dynamic = "force-dynamic";

function compactError(value: unknown): string {
  const text = value instanceof Error && value.stack ? value.stack : String(value);
  return text.split(/\r?\n/).slice(0, 40).join("\n").slice(0, 4000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupName = searchParams.get("group");
  const token = searchParams.get("token");
  const apiKey = searchParams.get("api_key");

  if (!groupName) {
    return NextResponse.json({ error: "Missing group name" }, { status: 400 });
  }

  try {
    const serverPayload = groupName.startsWith("custom-")
      ? await buildCustomTemplateLayoutPayloadFromApi(groupName)
      : await buildBuiltinTemplateLayoutPayload(groupName);

    if (serverPayload) {
      return NextResponse.json(serverPayload);
    }
  } catch (err) {
    console.warn("[api/template] server-side schema compilation failed, falling back to browser extraction", {
      group: groupName,
      error: compactError(err),
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const schemaSearchParams = new URLSearchParams({ group: groupName });
  if (token) {
    schemaSearchParams.set("token", token);
  }
  if (apiKey) {
    schemaSearchParams.set("api_key", apiKey);
  }
  const schemaPageUrl = `${baseUrl}/schema?${schemaSearchParams.toString()}`;
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
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
    await page.goto(schemaPageUrl, {
      waitUntil: "networkidle0",
      timeout: 300000,
    });

    await page.waitForSelector("[data-layouts]", { timeout: 300000 });
    await page.waitForSelector("[data-settings]", { timeout: 300000 });

    const { dataLayouts, dataGroupSettings } = await page.$eval(
      "[data-layouts]",
      (el) => ({
        dataLayouts: el.getAttribute("data-layouts"),
        dataGroupSettings: el.getAttribute("data-settings"),
      })
    );

    let slides, groupSettings;
    try {
      slides = JSON.parse(dataLayouts || "[]");
    } catch (e) {
      slides = [];
    }
    try {
      groupSettings = JSON.parse(dataGroupSettings || "null");
    } catch (e) {
      groupSettings = null;
    }

    const response = {
      name: groupName,
      ordered: groupSettings?.ordered ?? false,
      slides: slides.map((slide: any) => ({
        id: slide.id,
        name: slide.name,
        description: slide.description,
        json_schema: slide.json_schema,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    const diagnostics = {
      group: groupName,
      baseUrl,
      schemaPageUrl,
      executablePath: executablePath || null,
      error: compactError(err),
    };
    console.error("Puppeteer/API Error:", diagnostics);
    return NextResponse.json(
      {
        error: "Failed to fetch or parse client page",
        details: diagnostics.error,
        diagnostics,
      },
      { status: 500 }
    );

  } finally {
    if (browser) await browser.close();
  }
}
