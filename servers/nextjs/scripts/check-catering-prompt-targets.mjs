import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cateringDir = path.join(root, "presentation-templates", "catering");

const expectations = {
  "CoverKickerTitleSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']kicker["']/,
    /path:\s*["']title["']/,
  ],
  "HeaderQuoteTwoColumnsSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']title["']/,
    /path:\s*["']quote["']/,
    /path:\s*["']leftColumnTitle["']/,
    /path:\s*["']leftStrongLine["']/,
    /path:\s*["']leftWeakLine["']/,
    /path:\s*["']leftBody["']/,
    /path:\s*["']rightColumnTitle["']/,
    /path:\s*["']rightBody["']/,
    /rightBullets\[\$\{idx\}\]/,
  ],
  "HeaderColorCardsImageSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']title["']/,
    /path:\s*["']primaryTitle["']/,
    /path:\s*["']secondaryTitle["']/,
    /colorCards\[\$\{index\}\]\.hex/,
    /colorCards\[\$\{index\}\]\.description/,
    /path:\s*["']image\.__image_prompt__["']/,
  ],
  "HeaderImageFactsListSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']image\.__image_prompt__["']/,
    /path:\s*["']factsText["']/,
    /path:\s*["']assortmentText["']/,
  ],
  "HeaderTextBulletsImageSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']title["']/,
    /path:\s*["']lead["']/,
    /path:\s*["']listTitle["']/,
    /bullets\[\$\{idx\}\]/,
    /path:\s*["']footerNote["']/,
    /path:\s*["']image\.__image_prompt__["']/,
  ],
  "HeaderThreeImageCardsSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']title["']/,
    /cards\[\$\{idx\}\]\.title/,
    /cards\[\$\{idx\}\]\.image\.__image_prompt__/,
  ],
  "HeaderMoodboardCollageSlideLayout.tsx": [
    /promptTargetAttrs/,
    /path:\s*["']title["']/,
    /images\[\$\{0\}\]\.__image_prompt__/,
    /images\[\$\{1\}\]\.__image_prompt__/,
    /images\[\$\{2\}\]\.__image_prompt__/,
    /images\[\$\{3\}\]\.__image_prompt__/,
  ],
};

const failures = [];

for (const [fileName, patterns] of Object.entries(expectations)) {
  const sourcePath = path.join(cateringDir, fileName);
  const source = fs.readFileSync(sourcePath, "utf8");

  patterns.forEach((pattern) => {
    if (!pattern.test(source)) {
      failures.push(`${fileName} missing ${pattern}`);
    }
  });
}

if (failures.length) {
  console.error("Catering prompt target audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Catering prompt target audit passed.");
