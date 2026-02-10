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
    const cookieToken = req.cookies.get("auth_token")?.value;

    let token: string | null = null;
    if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
      token = authorization.split(" ", 2)[1] || null;
    }
    token = token || queryToken || cookieToken || null;

    return {
      token,
      apiKey: headerApiKey || queryApiKey || null,
    };
  };

  const { id, title } = await req.json();
  if (!id) {
    return NextResponse.json(
      { error: "Missing Presentation ID" },
      { status: 400 }
    );
  }

  const { token, apiKey } = extractAuth();
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
  const pdfMakerUrl = `${baseUrl}/pdf-maker?${pdfMakerParams.toString()}`;
  console.log(`Navigating to: ${baseUrl}/pdf-maker?id=${id}`);

  await page.goto(pdfMakerUrl, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  await page.waitForFunction('() => document.readyState === "complete"');

  try {
    console.log("Waiting for elements to load...");
    await page.waitForFunction(
      `
      () => {
        const allElements = document.querySelectorAll('*');
        let loadedElements = 0;
        let totalElements = allElements.length;
        
        for (let el of allElements) {
            const style = window.getComputedStyle(el);
            const isVisible = style.display !== 'none' && 
                            style.visibility !== 'hidden' && 
                            style.opacity !== '0';
            
            if (isVisible && el.offsetWidth > 0 && el.offsetHeight > 0) {
                loadedElements++;
            }
        }
        
        const progress = loadedElements / totalElements;
        // console.log("Loading progress:", progress, loadedElements, totalElements);
        return progress >= 0.99;
      }
      `,
      { timeout: 30000 }
    );
    console.log("Elements loaded.");
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
