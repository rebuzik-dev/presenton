import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const auditScript = path.join(__dirname, "check-legacy-template-prompt-targets.mjs");

const result = spawnSync(process.execPath, [auditScript, "catering"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
