import { NextResponse } from "next/server";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  const userConfigPath = process.env.USER_CONFIG_PATH;

  let keyFromFile = "";
  if (userConfigPath && fs.existsSync(userConfigPath)) {
    try {
      const raw = fs.readFileSync(userConfigPath, "utf-8");
      const cfg = JSON.parse(raw || "{}");
      keyFromFile = cfg?.TEMPLATE_API_KEY || cfg?.OPENAI_API_KEY || "";
    } catch { }
  }



  const keyFromEnv = process.env.TEMPLATE_API_KEY || process.env.OPENAI_API_KEY || "";
  console.log("Key check - File:", !!keyFromFile, "Env:", !!keyFromEnv, "EnvVar:", process.env.TEMPLATE_API_KEY ? "Set" : "Unset");
  const hasKey = Boolean((keyFromFile || keyFromEnv).trim());

  return NextResponse.json({ hasKey });
} 