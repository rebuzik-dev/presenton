import {
  TemplateGroupSettings,
  TemplateLayoutsWithSettings,
  TemplateWithData,
  createTemplateEntry,
} from "./utils";

import cateringConceptSettings from "../../presentation-templates/catering-concept/settings.json";
import visualCodeOverviewSettings from "../../presentation-templates/visual-code-overview/settings.json";
import decorConceptSettings from "../../presentation-templates/decor-concept/settings.json";
import floristryConceptSettings from "../../presentation-templates/floristry-concept/settings.json";
import giftSetConceptSettings from "../../presentation-templates/gift-set-concept/settings.json";
import souvenirConceptSettings from "../../presentation-templates/souvenir-concept/settings.json";
import videoContentConceptSettings from "../../presentation-templates/video-content-concept/settings.json";

import * as CateringConceptCover from "../../presentation-templates/catering-concept/CoverKickerTitleSlideLayout";
import * as CateringConceptQuote from "../../presentation-templates/catering-concept/HeaderQuoteTwoColumnsSlideLayout";
import * as CateringConceptPalette from "../../presentation-templates/catering-concept/HeaderColorCardsImageSlideLayout";
import * as CateringConceptFacts from "../../presentation-templates/catering-concept/HeaderImageFactsListSlideLayout";
import * as CateringConceptPrinciples from "../../presentation-templates/catering-concept/HeaderTextBulletsImageSlideLayout";
import * as CateringConceptSolutions from "../../presentation-templates/catering-concept/HeaderThreeImageCardsSlideLayout";
import * as CateringConceptMoodboard from "../../presentation-templates/catering-concept/HeaderMoodboardCollageSlideLayout";

import * as VisualCodeCover from "../../presentation-templates/visual-code-overview/CoverKickerTitleSlideLayout";
import * as VisualCodeQuote from "../../presentation-templates/visual-code-overview/HeaderQuoteTwoColumnsSlideLayout";
import * as VisualCodePalette from "../../presentation-templates/visual-code-overview/HeaderColorCardsImageSlideLayout";
import * as VisualCodeFacts from "../../presentation-templates/visual-code-overview/HeaderImageFactsListSlideLayout";
import * as VisualCodePrinciples from "../../presentation-templates/visual-code-overview/HeaderTextBulletsImageSlideLayout";
import * as VisualCodeSolutions from "../../presentation-templates/visual-code-overview/HeaderThreeImageCardsSlideLayout";
import * as VisualCodeMoodboard from "../../presentation-templates/visual-code-overview/HeaderMoodboardCollageSlideLayout";

import * as DecorConceptCover from "../../presentation-templates/decor-concept/DecorCoverTitleSlideLayout";
import * as DecorConceptMission from "../../presentation-templates/decor-concept/DecorConceptMissionKeyIdeasSlideLayout";
import * as DecorConceptPalette from "../../presentation-templates/decor-concept/DecorColorPaletteSlideLayout";
import * as DecorConceptTypography from "../../presentation-templates/decor-concept/DecorTypographySlideLayout";
import * as DecorConceptOverview from "../../presentation-templates/decor-concept/DecorElementsOverviewSlideLayout";
import * as DecorConceptAccent from "../../presentation-templates/decor-concept/DecorElementsAccentSlideLayout";
import * as DecorConceptStage from "../../presentation-templates/decor-concept/StageDesignProposalsSlideLayout";
import * as DecorConceptPhotozone from "../../presentation-templates/decor-concept/PhotozoneDesignProposalsSlideLayout";

import * as FloristryConceptCover from "../../presentation-templates/floristry-concept/DecorCoverTitleSlideLayout";
import * as FloristryConceptMission from "../../presentation-templates/floristry-concept/DecorConceptMissionKeyIdeasSlideLayout";
import * as FloristryConceptPalette from "../../presentation-templates/floristry-concept/DecorColorPaletteSlideLayout";
import * as FloristryConceptTypography from "../../presentation-templates/floristry-concept/DecorTypographySlideLayout";
import * as FloristryConceptOverview from "../../presentation-templates/floristry-concept/DecorElementsOverviewSlideLayout";
import * as FloristryConceptAccent from "../../presentation-templates/floristry-concept/DecorElementsAccentSlideLayout";
import * as FloristryConceptStage from "../../presentation-templates/floristry-concept/StageDesignProposalsSlideLayout";
import * as FloristryConceptPhotozone from "../../presentation-templates/floristry-concept/PhotozoneDesignProposalsSlideLayout";

import * as GiftSetCover from "../../presentation-templates/gift-set-concept/CoverBackgroundKickerTitleSlideLayout";
import * as GiftSetQuote from "../../presentation-templates/gift-set-concept/HeaderQuoteTwoColumnsLinesSlideLayout";
import * as GiftSetPalette from "../../presentation-templates/gift-set-concept/PaletteGridImageSlideLayout";
import * as GiftSetTypography from "../../presentation-templates/gift-set-concept/TypographyTwoColumnsImageSlideLayout";
import * as GiftSetMoodboard from "../../presentation-templates/gift-set-concept/MoodboardCollage4SlideLayout";
import * as GiftSetPattern from "../../presentation-templates/gift-set-concept/HeaderParagraphPatternImageSlideLayout";
import * as GiftSetElements from "../../presentation-templates/gift-set-concept/DesignElementsMultiColumnSlideLayout";
import * as GiftSetFinishes from "../../presentation-templates/gift-set-concept/DesignElementsTextImageSwatchesSlideLayout";
import * as GiftSetTwo from "../../presentation-templates/gift-set-concept/ProposalsTwoImagesSlideLayout";
import * as GiftSetThree from "../../presentation-templates/gift-set-concept/ProposalsThreeImagesSlideLayout";
import * as GiftSetCollage from "../../presentation-templates/gift-set-concept/ProposalsCollageLeftRightStackSlideLayout";

import * as SouvenirConceptCover from "../../presentation-templates/souvenir-concept/CoverBackgroundKickerTitleSlideLayout";
import * as SouvenirConceptQuote from "../../presentation-templates/souvenir-concept/HeaderQuoteTwoColumnsLinesSlideLayout";
import * as SouvenirConceptPalette from "../../presentation-templates/souvenir-concept/PaletteGridImageSlideLayout";
import * as SouvenirConceptTypography from "../../presentation-templates/souvenir-concept/TypographyTwoColumnsImageSlideLayout";
import * as SouvenirConceptMoodboard from "../../presentation-templates/souvenir-concept/MoodboardCollage4SlideLayout";
import * as SouvenirConceptPattern from "../../presentation-templates/souvenir-concept/HeaderParagraphPatternImageSlideLayout";
import * as SouvenirConceptElements from "../../presentation-templates/souvenir-concept/DesignElementsMultiColumnSlideLayout";
import * as SouvenirConceptFinishes from "../../presentation-templates/souvenir-concept/DesignElementsTextImageSwatchesSlideLayout";
import * as SouvenirConceptTwo from "../../presentation-templates/souvenir-concept/ProposalsTwoImagesSlideLayout";
import * as SouvenirConceptThree from "../../presentation-templates/souvenir-concept/ProposalsThreeImagesSlideLayout";
import * as SouvenirConceptCollage from "../../presentation-templates/souvenir-concept/ProposalsCollageLeftRightStackSlideLayout";

import * as VideoContentTitle from "../../presentation-templates/video-content-concept/TitleEventHeaderSlideLayout";
import * as VideoContentConcept from "../../presentation-templates/video-content-concept/ConceptMissionMoodSlideLayout";
import * as VideoContentPalette from "../../presentation-templates/video-content-concept/ColorPaletteListingSlideLayout";
import * as VideoContentTypography from "../../presentation-templates/video-content-concept/TypographySpecSlideLayout";
import * as VideoContentHook from "../../presentation-templates/video-content-concept/StoryboardFrameDescriptionSlideLayout";
import * as VideoContentDevelopment from "../../presentation-templates/video-content-concept/StoryboardSplitVisualSlideLayout";
import * as VideoContentKeyPoint from "../../presentation-templates/video-content-concept/StoryboardEventPointSlideLayout";
import * as VideoContentClimax from "../../presentation-templates/video-content-concept/StoryboardClimaxSlideLayout";

type LayoutModule = {
  default: TemplateWithData["component"];
  Schema: TemplateWithData["schema"];
  layoutId: string;
  layoutName: string;
  layoutDescription: string;
};

const entry = (module: LayoutModule, templateID: string, fileName: string) =>
  createTemplateEntry(
    module.default,
    module.Schema,
    module.layoutId,
    module.layoutName,
    module.layoutDescription,
    templateID,
    fileName,
  );

const cateringConceptTemplates = [
  entry(CateringConceptCover, "catering-concept", "CoverKickerTitleSlideLayout"),
  entry(CateringConceptQuote, "catering-concept", "HeaderQuoteTwoColumnsSlideLayout"),
  entry(CateringConceptPalette, "catering-concept", "HeaderColorCardsImageSlideLayout"),
  entry(CateringConceptFacts, "catering-concept", "HeaderImageFactsListSlideLayout"),
  entry(CateringConceptPrinciples, "catering-concept", "HeaderTextBulletsImageSlideLayout"),
  entry(CateringConceptSolutions, "catering-concept", "HeaderThreeImageCardsSlideLayout"),
  entry(CateringConceptMoodboard, "catering-concept", "HeaderMoodboardCollageSlideLayout"),
];

const visualCodeOverviewTemplates = [
  entry(VisualCodeCover, "visual-code-overview", "CoverKickerTitleSlideLayout"),
  entry(VisualCodeQuote, "visual-code-overview", "HeaderQuoteTwoColumnsSlideLayout"),
  entry(VisualCodePalette, "visual-code-overview", "HeaderColorCardsImageSlideLayout"),
  entry(VisualCodeFacts, "visual-code-overview", "HeaderImageFactsListSlideLayout"),
  entry(VisualCodePrinciples, "visual-code-overview", "HeaderTextBulletsImageSlideLayout"),
  entry(VisualCodeSolutions, "visual-code-overview", "HeaderThreeImageCardsSlideLayout"),
  entry(VisualCodeMoodboard, "visual-code-overview", "HeaderMoodboardCollageSlideLayout"),
];

const decorConceptTemplates = [
  entry(DecorConceptCover, "decor-concept", "DecorCoverTitleSlideLayout"),
  entry(DecorConceptMission, "decor-concept", "DecorConceptMissionKeyIdeasSlideLayout"),
  entry(DecorConceptPalette, "decor-concept", "DecorColorPaletteSlideLayout"),
  entry(DecorConceptTypography, "decor-concept", "DecorTypographySlideLayout"),
  entry(DecorConceptOverview, "decor-concept", "DecorElementsOverviewSlideLayout"),
  entry(DecorConceptAccent, "decor-concept", "DecorElementsAccentSlideLayout"),
  entry(DecorConceptStage, "decor-concept", "StageDesignProposalsSlideLayout"),
  entry(DecorConceptPhotozone, "decor-concept", "PhotozoneDesignProposalsSlideLayout"),
];

const floristryConceptTemplates = [
  entry(FloristryConceptCover, "floristry-concept", "DecorCoverTitleSlideLayout"),
  entry(FloristryConceptMission, "floristry-concept", "DecorConceptMissionKeyIdeasSlideLayout"),
  entry(FloristryConceptPalette, "floristry-concept", "DecorColorPaletteSlideLayout"),
  entry(FloristryConceptTypography, "floristry-concept", "DecorTypographySlideLayout"),
  entry(FloristryConceptOverview, "floristry-concept", "DecorElementsOverviewSlideLayout"),
  entry(FloristryConceptAccent, "floristry-concept", "DecorElementsAccentSlideLayout"),
  entry(FloristryConceptStage, "floristry-concept", "StageDesignProposalsSlideLayout"),
  entry(FloristryConceptPhotozone, "floristry-concept", "PhotozoneDesignProposalsSlideLayout"),
];

const giftSetConceptTemplates = [
  entry(GiftSetCover, "gift-set-concept", "CoverBackgroundKickerTitleSlideLayout"),
  entry(GiftSetQuote, "gift-set-concept", "HeaderQuoteTwoColumnsLinesSlideLayout"),
  entry(GiftSetPalette, "gift-set-concept", "PaletteGridImageSlideLayout"),
  entry(GiftSetTypography, "gift-set-concept", "TypographyTwoColumnsImageSlideLayout"),
  entry(GiftSetMoodboard, "gift-set-concept", "MoodboardCollage4SlideLayout"),
  entry(GiftSetPattern, "gift-set-concept", "HeaderParagraphPatternImageSlideLayout"),
  entry(GiftSetElements, "gift-set-concept", "DesignElementsMultiColumnSlideLayout"),
  entry(GiftSetFinishes, "gift-set-concept", "DesignElementsTextImageSwatchesSlideLayout"),
  entry(GiftSetTwo, "gift-set-concept", "ProposalsTwoImagesSlideLayout"),
  entry(GiftSetThree, "gift-set-concept", "ProposalsThreeImagesSlideLayout"),
  entry(GiftSetCollage, "gift-set-concept", "ProposalsCollageLeftRightStackSlideLayout"),
];

const souvenirConceptTemplates = [
  entry(SouvenirConceptCover, "souvenir-concept", "CoverBackgroundKickerTitleSlideLayout"),
  entry(SouvenirConceptQuote, "souvenir-concept", "HeaderQuoteTwoColumnsLinesSlideLayout"),
  entry(SouvenirConceptPalette, "souvenir-concept", "PaletteGridImageSlideLayout"),
  entry(SouvenirConceptTypography, "souvenir-concept", "TypographyTwoColumnsImageSlideLayout"),
  entry(SouvenirConceptMoodboard, "souvenir-concept", "MoodboardCollage4SlideLayout"),
  entry(SouvenirConceptPattern, "souvenir-concept", "HeaderParagraphPatternImageSlideLayout"),
  entry(SouvenirConceptElements, "souvenir-concept", "DesignElementsMultiColumnSlideLayout"),
  entry(SouvenirConceptFinishes, "souvenir-concept", "DesignElementsTextImageSwatchesSlideLayout"),
  entry(SouvenirConceptTwo, "souvenir-concept", "ProposalsTwoImagesSlideLayout"),
  entry(SouvenirConceptThree, "souvenir-concept", "ProposalsThreeImagesSlideLayout"),
  entry(SouvenirConceptCollage, "souvenir-concept", "ProposalsCollageLeftRightStackSlideLayout"),
];

const videoContentConceptTemplates = [
  entry(VideoContentTitle, "video-content-concept", "TitleEventHeaderSlideLayout"),
  entry(VideoContentConcept, "video-content-concept", "ConceptMissionMoodSlideLayout"),
  entry(VideoContentPalette, "video-content-concept", "ColorPaletteListingSlideLayout"),
  entry(VideoContentTypography, "video-content-concept", "TypographySpecSlideLayout"),
  entry(VideoContentHook, "video-content-concept", "StoryboardFrameDescriptionSlideLayout"),
  entry(VideoContentDevelopment, "video-content-concept", "StoryboardSplitVisualSlideLayout"),
  entry(VideoContentKeyPoint, "video-content-concept", "StoryboardEventPointSlideLayout"),
  entry(VideoContentClimax, "video-content-concept", "StoryboardClimaxSlideLayout"),
];

export const dedicatedFileTemplateGroups: TemplateLayoutsWithSettings[] = [
  { id: "catering-concept", name: "Catering Concept", description: cateringConceptSettings.description, settings: cateringConceptSettings as TemplateGroupSettings, layouts: cateringConceptTemplates },
  { id: "visual-code-overview", name: "Visual Code Overview", description: visualCodeOverviewSettings.description, settings: visualCodeOverviewSettings as TemplateGroupSettings, layouts: visualCodeOverviewTemplates },
  { id: "decor-concept", name: "Decor Concept", description: decorConceptSettings.description, settings: decorConceptSettings as TemplateGroupSettings, layouts: decorConceptTemplates },
  { id: "floristry-concept", name: "Floristry Concept", description: floristryConceptSettings.description, settings: floristryConceptSettings as TemplateGroupSettings, layouts: floristryConceptTemplates },
  { id: "gift-set-concept", name: "Gift Set Concept", description: giftSetConceptSettings.description, settings: giftSetConceptSettings as TemplateGroupSettings, layouts: giftSetConceptTemplates },
  { id: "souvenir-concept", name: "Souvenir Concept", description: souvenirConceptSettings.description, settings: souvenirConceptSettings as TemplateGroupSettings, layouts: souvenirConceptTemplates },
  { id: "video-content-concept", name: "Video Content Concept", description: videoContentConceptSettings.description, settings: videoContentConceptSettings as TemplateGroupSettings, layouts: videoContentConceptTemplates },
];

export const dedicatedFileTemplateLayouts: TemplateWithData[] =
  dedicatedFileTemplateGroups.flatMap((group) => group.layouts);
