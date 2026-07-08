import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "app", "(presentation-generator)", "utils", "templatePromptBlocks.ts");

if (!fs.existsSync(entry)) {
  console.error("Template prompt block expansion audit failed:");
  console.error(`- ${path.relative(root, entry)} does not exist`);
  process.exit(1);
}

const outFile = path.join(os.tmpdir(), `template-prompt-blocks-${Date.now()}.mjs`);
await build({
  entryPoints: [entry],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["react", "sonner"],
  logLevel: "silent",
});

const { buildTemplatePromptBlocks } = await import(pathToFileURL(outFile).href);

const data = {
  template: "catering",
  template_id: null,
  template_name: "Catering",
  template_type: "built-in",
  source_prompt: null,
  prompt_profile: {
    id: null,
    template_slug: "catering",
    template_id: null,
    is_active: true,
    template_prompt: null,
    layout_prompts: {
      "catering:header-three-image-cards": {
        field_prompts: {
          "cards[].title": "Legacy wildcard title prompt",
          "cards[1].title": "Indexed second title prompt",
        },
        image_prompt_overrides: {
          "cards[].image.__image_prompt__": "Legacy wildcard image prompt",
          "cards[2].image.__image_prompt__": "Indexed third image prompt",
        },
      },
    },
    created_at: null,
    updated_at: null,
  },
  schema_summary: {
    template: "catering",
    ordered: false,
    layout_count: 1,
    layouts: [
      {
        index: 5,
        layout_id: "catering:header-three-image-cards",
        layout_name: "Header Three Image Cards Slide",
        layout_description: "A slide with a header and a row of image cards with titles.",
        source_file: "HeaderThreeImageCardsSlideLayout.tsx",
        fields_summary: [
          { path: "title", type: "string", required: true, description: "Main header. Max 3 words" },
          { path: "cards[].title", type: "string", required: true, description: "Card title. Max 3 words" },
          {
            path: "cards[].image.__image_prompt__",
            type: "string",
            required: true,
            description: "Decor image",
            special_kind: "image_prompt",
          },
        ],
        content_slots: { image_slots: 3, icon_slots: 0, array_slots: [] },
      },
    ],
  },
  image_summary: {
    template: "catering",
    ordered: false,
    total_image_prompt_slots: 3,
    slides: [
      {
        index: 5,
        layout_id: "catering:header-three-image-cards",
        layout_name: "Header Three Image Cards Slide",
        slide_description: "",
        image_prompt_slots: 3,
        image_prompts: ["Flower decor", "Table setting", "Decor elements"],
      },
    ],
  },
};

const layout = data.schema_summary.layouts[0];
const sampleData = {
  title: "Decor",
  cards: [
    { title: "Flowers", image: { __image_prompt__: "Flower decor" } },
    { title: "Serving", image: { __image_prompt__: "Table setting" } },
    { title: "Elements", image: { __image_prompt__: "Decor elements" } },
  ],
};
const visualTargetIds = new Set([
  "catering%3Aheader-three-image-cards:field:cards.%5B%5D.title",
  "catering%3Aheader-three-image-cards:field:cards.0.title",
  "catering%3Aheader-three-image-cards:field:cards.1.title",
  "catering%3Aheader-three-image-cards:field:cards.2.title",
  "catering%3Aheader-three-image-cards:image:cards.0.image.__image_prompt__",
  "catering%3Aheader-three-image-cards:image:cards.1.image.__image_prompt__",
  "catering%3Aheader-three-image-cards:image:cards.2.image.__image_prompt__",
]);

const blocks = buildTemplatePromptBlocks(data, layout, { sampleData, visualTargetIds });
const fieldPaths = blocks.filter((block) => block.type === "field").map((block) => block.path);
const imageBlocks = blocks.filter((block) => block.type === "image");
const imagePaths = imageBlocks.map((block) => block.path);
const disabledImageBlocks = imageBlocks.filter((block) => block.disabled);

const failures = [];
for (const expected of ["cards[0].title", "cards[1].title", "cards[2].title"]) {
  if (!fieldPaths.includes(expected)) failures.push(`missing field block ${expected}`);
}
for (const expected of [
  "cards[0].image.__image_prompt__",
  "cards[1].image.__image_prompt__",
  "cards[2].image.__image_prompt__",
]) {
  if (!imagePaths.includes(expected)) failures.push(`missing image block ${expected}`);
}
if (fieldPaths.includes("cards[].title")) failures.push("wildcard card title block should be expanded");
if (imagePaths.includes("cards[].image.__image_prompt__")) failures.push("wildcard image prompt block should be expanded");
if (disabledImageBlocks.length !== 0) failures.push(`expected no disabled image prompts, got ${disabledImageBlocks.length}`);

const secondTitle = blocks.find((block) => block.path === "cards[1].title");
const firstTitle = blocks.find((block) => block.path === "cards[0].title");
const thirdImage = blocks.find((block) => block.path === "cards[2].image.__image_prompt__");
const firstImage = blocks.find((block) => block.path === "cards[0].image.__image_prompt__");

if (secondTitle?.savedOverride !== "Indexed second title prompt") failures.push("indexed field override was not preferred");
if (firstTitle?.savedOverride !== "Legacy wildcard title prompt") failures.push("wildcard field override fallback was not used");
if (thirdImage?.savedOverride !== "Indexed third image prompt") failures.push("indexed image override was not preferred");
if (firstImage?.savedOverride !== "Legacy wildcard image prompt") failures.push("wildcard image override fallback was not used");

if (failures.length) {
  console.error("Template prompt block expansion audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Template prompt block expansion audit passed.");
