import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const requestedGroups = new Set(process.argv.slice(2));

const allGroups = {
  catering: {
    dir: "catering",
    files: {
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
    },
  },
  video: {
    dir: "video",
    files: {
      "TitleEventHeaderSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']documentType["']/,
        /path:\s*["']eventName["']/,
      ],
      "ConceptMissionMoodSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']heroQuote["']/,
        /path:\s*["']missionTitle["']/,
        /path:\s*["']missionContent["']/,
        /path:\s*["']moodTitle["']/,
        /path:\s*["']moodContent["']/,
      ],
      "ColorPaletteListingSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']primaryTitle["']/,
        /path:\s*["']secondaryTitle["']/,
        /\$\{pathPrefix\}\[\$\{index\}\]\.hex/,
        /\$\{pathPrefix\}\[\$\{index\}\]\.label/,
        /pathPrefix="primaryColors"/,
        /pathPrefix="secondaryColors"/,
        /path:\s*["']image\.__image_prompt__["']/,
      ],
      "TypographySpecSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']rightImage\.__image_prompt__["']/,
      ],
      "StoryboardFrameDescriptionSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']phase["']/,
        /path:\s*["']timing["']/,
        /path:\s*["']framesLabel["']/,
        /path:\s*["']visualDescription["']/,
        /path:\s*["']voiceoverLabel["']/,
        /path:\s*["']voiceover["']/,
        /path:\s*["']imageLeft\.__image_prompt__["']/,
        /path:\s*["']imageRight\.__image_prompt__["']/,
      ],
      "StoryboardSplitVisualSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']phase["']/,
        /path:\s*["']timing["']/,
        /path:\s*["']framesText["']/,
        /path:\s*["']graphicsTextBlock["']/,
        /path:\s*["']badgeText["']/,
        /visuals\[\$\{0\}\]\.__image_prompt__/,
        /visuals\[\$\{1\}\]\.__image_prompt__/,
      ],
      "StoryboardEventPointSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']phase["']/,
        /path:\s*["']timing["']/,
        /path:\s*["']framesText["']/,
        /path:\s*["']graphicsTextBlock["']/,
        /path:\s*["']badgeText["']/,
        /visuals\[\$\{0\}\]\.__image_prompt__/,
        /visuals\[\$\{1\}\]\.__image_prompt__/,
      ],
      "StoryboardClimaxSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']phase["']/,
        /path:\s*["']timing["']/,
        /path:\s*["']framesText["']/,
        /path:\s*["']graphicsTextBlock["']/,
        /visuals\[\$\{0\}\]\.__image_prompt__/,
        /visuals\[\$\{1\}\]\.__image_prompt__/,
      ],
    },
  },
  "decor-floristics-template": {
    dir: "decor-floristics-template",
    files: {
      "DecorCoverTitleSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']documentType["']/,
        /path:\s*["']eventName["']/,
      ],
      "DecorConceptMissionKeyIdeasSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']heroQuote["']/,
        /path:\s*["']missionTitle["']/,
        /path:\s*["']missionContent["']/,
        /path:\s*["']moodTitle["']/,
        /path:\s*["']moodContent["']/,
      ],
      "DecorColorPaletteSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']primaryTitle["']/,
        /path:\s*["']secondaryTitle["']/,
        /\$\{pathPrefix\}\[\$\{index\}\]\.hex/,
        /\$\{pathPrefix\}\[\$\{index\}\]\.label/,
        /pathPrefix="primaryColors"/,
        /pathPrefix="secondaryColors"/,
        /path:\s*["']image\.__image_prompt__["']/,
      ],
      "DecorTypographySlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']rightImage\.__image_prompt__["']/,
      ],
      "DecorElementsOverviewSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']descriptionTop["']/,
        /path:\s*["']descriptionBottom["']/,
        /path:\s*["']image\.__image_prompt__["']/,
      ],
      "DecorElementsAccentSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']textTop["']/,
        /path:\s*["']textBottom["']/,
        /path:\s*["']image\.__image_prompt__["']/,
      ],
      "StageDesignProposalsSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']leftLabel["']/,
        /visuals\[\$\{0\}\]\.__image_prompt__/,
        /visuals\[\$\{1\}\]\.__image_prompt__/,
      ],
      "PhotozoneDesignProposalsSlideLayout.tsx": [
        /promptTargetAttrs/,
        /path:\s*["']title["']/,
        /path:\s*["']leftLabel["']/,
        /visuals\[\$\{0\}\]\.__image_prompt__/,
        /visuals\[\$\{1\}\]\.__image_prompt__/,
      ],
    },
  },
  souvenir: {
    dir: "souvenir",
    files: {},
  },
};

const selectedGroups = requestedGroups.size
  ? Object.fromEntries(Object.entries(allGroups).filter(([group]) => requestedGroups.has(group)))
  : allGroups;

const failures = [];

for (const [group, config] of Object.entries(selectedGroups)) {
  if (!config) {
    failures.push(`Unknown group ${group}`);
    continue;
  }
  for (const [fileName, patterns] of Object.entries(config.files)) {
    const sourcePath = path.join(root, "presentation-templates", config.dir, fileName);
    if (!fs.existsSync(sourcePath)) {
      failures.push(`${group}/${fileName} does not exist`);
      continue;
    }
    const source = fs.readFileSync(sourcePath, "utf8");
    patterns.forEach((pattern) => {
      if (!pattern.test(source)) {
        failures.push(`${group}/${fileName} missing ${pattern}`);
      }
    });
  }
}

if (failures.length) {
  console.error("Legacy prompt target audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Legacy prompt target audit passed.");
