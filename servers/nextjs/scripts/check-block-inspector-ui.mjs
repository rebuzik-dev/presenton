import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const checks = [
  {
    file: "app/(presentation-generator)/presentation/components/block-editor/AnchoredBlockPromptPopover.tsx",
    patterns: [/Block regeneration coming next/, /Reset override/, /Textarea/],
  },
  {
    file: "app/(presentation-generator)/components/PromptInspectableSlideFrame.tsx",
    patterns: [/renderTargetPopover/, /PopoverContent/, /z-\[80\]/, /z-\[1000\]/],
  },
  {
    file: "app/(presentation-generator)/presentation/components/block-editor/SlideBlockOverlay.tsx",
    patterns: [/renderBlockPopover/, /PopoverContent/, /z-\[80\]/, /z-\[1000\]/],
  },
  {
    file: "app/(presentation-generator)/presentation/components/SlideContent.tsx",
    patterns: [/onRequestBlockEdit/, /Edit block prompts/],
  },
  {
    file: "app/(presentation-generator)/components/TemplatePromptBlocksInline.tsx",
    patterns: [/Collapsible/, /Non-visual/, /Unmapped/, /sampleData\?: unknown/],
  },
  {
    file: "app/(presentation-generator)/utils/templatePromptBlocks.ts",
    patterns: [/BuildTemplatePromptBlocksOptions/, /visualTargetIds/, /sampleData/, /Card title/],
  },
  {
    file: "app/(presentation-generator)/template-preview/components/TemplatePreviewClient.tsx",
    patterns: [/AnchoredBlockPromptPopover/, /renderTargetPopover/, /normalizePromptPath/, /sampleData=\{template\.sampleData\}/],
  },
  {
    file: "app/(presentation-generator)/presentation/components/PresentationPage.tsx",
    patterns: [/blockEditSlideIndex/, /setBlockEditSlideIndex\(null\)/],
  },
];

const failures = [];

for (const check of checks) {
  const fullPath = path.join(root, check.file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${check.file} does not exist`);
    continue;
  }
  const source = fs.readFileSync(fullPath, "utf8");
  check.patterns.forEach((pattern) => {
    if (!pattern.test(source)) {
      failures.push(`${check.file} missing ${pattern}`);
    }
  });
}

if (failures.length) {
  console.error("Block inspector UI audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Block inspector UI audit passed.");
