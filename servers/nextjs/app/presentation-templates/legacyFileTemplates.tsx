import {
  TemplateGroupSettings,
  TemplateLayoutsWithSettings,
  TemplateWithData,
  createTemplateEntry,
} from "./utils";

import cateringSettings from "../../presentation-templates/catering/settings.json";
import decorFloristicsSettings from "../../presentation-templates/decor-floristics-template/settings.json";
import souvenirSettings from "../../presentation-templates/souvenir/settings.json";
import videoSettings from "../../presentation-templates/video/settings.json";

import CateringCoverKickerTitle, {
  Schema as CateringCoverKickerTitleSchema,
  layoutId as CateringCoverKickerTitleId,
  layoutName as CateringCoverKickerTitleName,
  layoutDescription as CateringCoverKickerTitleDescription,
} from "../../presentation-templates/catering/CoverKickerTitleSlideLayout";
import CateringHeaderQuoteTwoColumns, {
  Schema as CateringHeaderQuoteTwoColumnsSchema,
  layoutId as CateringHeaderQuoteTwoColumnsId,
  layoutName as CateringHeaderQuoteTwoColumnsName,
  layoutDescription as CateringHeaderQuoteTwoColumnsDescription,
} from "../../presentation-templates/catering/HeaderQuoteTwoColumnsSlideLayout";
import CateringHeaderColorCardsImage, {
  Schema as CateringHeaderColorCardsImageSchema,
  layoutId as CateringHeaderColorCardsImageId,
  layoutName as CateringHeaderColorCardsImageName,
  layoutDescription as CateringHeaderColorCardsImageDescription,
} from "../../presentation-templates/catering/HeaderColorCardsImageSlideLayout";
import CateringHeaderImageFactsList, {
  Schema as CateringHeaderImageFactsListSchema,
  layoutId as CateringHeaderImageFactsListId,
  layoutName as CateringHeaderImageFactsListName,
  layoutDescription as CateringHeaderImageFactsListDescription,
} from "../../presentation-templates/catering/HeaderImageFactsListSlideLayout";
import CateringHeaderTextBulletsImage, {
  Schema as CateringHeaderTextBulletsImageSchema,
  layoutId as CateringHeaderTextBulletsImageId,
  layoutName as CateringHeaderTextBulletsImageName,
  layoutDescription as CateringHeaderTextBulletsImageDescription,
} from "../../presentation-templates/catering/HeaderTextBulletsImageSlideLayout";
import CateringHeaderThreeImageCards, {
  Schema as CateringHeaderThreeImageCardsSchema,
  layoutId as CateringHeaderThreeImageCardsId,
  layoutName as CateringHeaderThreeImageCardsName,
  layoutDescription as CateringHeaderThreeImageCardsDescription,
} from "../../presentation-templates/catering/HeaderThreeImageCardsSlideLayout";
import CateringHeaderMoodboardCollage, {
  Schema as CateringHeaderMoodboardCollageSchema,
  layoutId as CateringHeaderMoodboardCollageId,
  layoutName as CateringHeaderMoodboardCollageName,
  layoutDescription as CateringHeaderMoodboardCollageDescription,
} from "../../presentation-templates/catering/HeaderMoodboardCollageSlideLayout";

import DecorCoverTitle, {
  Schema as DecorCoverTitleSchema,
  layoutId as DecorCoverTitleId,
  layoutName as DecorCoverTitleName,
  layoutDescription as DecorCoverTitleDescription,
} from "../../presentation-templates/decor-floristics-template/DecorCoverTitleSlideLayout";
import DecorConceptMissionKeyIdeas, {
  Schema as DecorConceptMissionKeyIdeasSchema,
  layoutId as DecorConceptMissionKeyIdeasId,
  layoutName as DecorConceptMissionKeyIdeasName,
  layoutDescription as DecorConceptMissionKeyIdeasDescription,
} from "../../presentation-templates/decor-floristics-template/DecorConceptMissionKeyIdeasSlideLayout";
import DecorColorPalette, {
  Schema as DecorColorPaletteSchema,
  layoutId as DecorColorPaletteId,
  layoutName as DecorColorPaletteName,
  layoutDescription as DecorColorPaletteDescription,
} from "../../presentation-templates/decor-floristics-template/DecorColorPaletteSlideLayout";
import DecorTypography, {
  Schema as DecorTypographySchema,
  layoutId as DecorTypographyId,
  layoutName as DecorTypographyName,
  layoutDescription as DecorTypographyDescription,
} from "../../presentation-templates/decor-floristics-template/DecorTypographySlideLayout";
import DecorElementsOverview, {
  Schema as DecorElementsOverviewSchema,
  layoutId as DecorElementsOverviewId,
  layoutName as DecorElementsOverviewName,
  layoutDescription as DecorElementsOverviewDescription,
} from "../../presentation-templates/decor-floristics-template/DecorElementsOverviewSlideLayout";
import DecorElementsAccent, {
  Schema as DecorElementsAccentSchema,
  layoutId as DecorElementsAccentId,
  layoutName as DecorElementsAccentName,
  layoutDescription as DecorElementsAccentDescription,
} from "../../presentation-templates/decor-floristics-template/DecorElementsAccentSlideLayout";
import DecorStageDesignProposals, {
  Schema as DecorStageDesignProposalsSchema,
  layoutId as DecorStageDesignProposalsId,
  layoutName as DecorStageDesignProposalsName,
  layoutDescription as DecorStageDesignProposalsDescription,
} from "../../presentation-templates/decor-floristics-template/StageDesignProposalsSlideLayout";
import DecorPhotozoneDesignProposals, {
  Schema as DecorPhotozoneDesignProposalsSchema,
  layoutId as DecorPhotozoneDesignProposalsId,
  layoutName as DecorPhotozoneDesignProposalsName,
  layoutDescription as DecorPhotozoneDesignProposalsDescription,
} from "../../presentation-templates/decor-floristics-template/PhotozoneDesignProposalsSlideLayout";

import SouvenirCoverBackgroundKickerTitle, {
  Schema as SouvenirCoverBackgroundKickerTitleSchema,
  layoutId as SouvenirCoverBackgroundKickerTitleId,
  layoutName as SouvenirCoverBackgroundKickerTitleName,
  layoutDescription as SouvenirCoverBackgroundKickerTitleDescription,
} from "../../presentation-templates/souvenir/CoverBackgroundKickerTitleSlideLayout";
import SouvenirHeaderQuoteTwoColumnsLines, {
  Schema as SouvenirHeaderQuoteTwoColumnsLinesSchema,
  layoutId as SouvenirHeaderQuoteTwoColumnsLinesId,
  layoutName as SouvenirHeaderQuoteTwoColumnsLinesName,
  layoutDescription as SouvenirHeaderQuoteTwoColumnsLinesDescription,
} from "../../presentation-templates/souvenir/HeaderQuoteTwoColumnsLinesSlideLayout";
import SouvenirPaletteGridImage, {
  Schema as SouvenirPaletteGridImageSchema,
  layoutId as SouvenirPaletteGridImageId,
  layoutName as SouvenirPaletteGridImageName,
  layoutDescription as SouvenirPaletteGridImageDescription,
} from "../../presentation-templates/souvenir/PaletteGridImageSlideLayout";
import SouvenirTypographyTwoColumnsImage, {
  Schema as SouvenirTypographyTwoColumnsImageSchema,
  layoutId as SouvenirTypographyTwoColumnsImageId,
  layoutName as SouvenirTypographyTwoColumnsImageName,
  layoutDescription as SouvenirTypographyTwoColumnsImageDescription,
} from "../../presentation-templates/souvenir/TypographyTwoColumnsImageSlideLayout";
import SouvenirMoodboardCollage4, {
  Schema as SouvenirMoodboardCollage4Schema,
  layoutId as SouvenirMoodboardCollage4Id,
  layoutName as SouvenirMoodboardCollage4Name,
  layoutDescription as SouvenirMoodboardCollage4Description,
} from "../../presentation-templates/souvenir/MoodboardCollage4SlideLayout";
import SouvenirHeaderParagraphPatternImage, {
  Schema as SouvenirHeaderParagraphPatternImageSchema,
  layoutId as SouvenirHeaderParagraphPatternImageId,
  layoutName as SouvenirHeaderParagraphPatternImageName,
  layoutDescription as SouvenirHeaderParagraphPatternImageDescription,
} from "../../presentation-templates/souvenir/HeaderParagraphPatternImageSlideLayout";
import SouvenirDesignElementsMultiColumn, {
  Schema as SouvenirDesignElementsMultiColumnSchema,
  layoutId as SouvenirDesignElementsMultiColumnId,
  layoutName as SouvenirDesignElementsMultiColumnName,
  layoutDescription as SouvenirDesignElementsMultiColumnDescription,
} from "../../presentation-templates/souvenir/DesignElementsMultiColumnSlideLayout";
import SouvenirDesignElementsTextImageSwatches, {
  Schema as SouvenirDesignElementsTextImageSwatchesSchema,
  layoutId as SouvenirDesignElementsTextImageSwatchesId,
  layoutName as SouvenirDesignElementsTextImageSwatchesName,
  layoutDescription as SouvenirDesignElementsTextImageSwatchesDescription,
} from "../../presentation-templates/souvenir/DesignElementsTextImageSwatchesSlideLayout";
import SouvenirProposalsTwoImages, {
  Schema as SouvenirProposalsTwoImagesSchema,
  layoutId as SouvenirProposalsTwoImagesId,
  layoutName as SouvenirProposalsTwoImagesName,
  layoutDescription as SouvenirProposalsTwoImagesDescription,
} from "../../presentation-templates/souvenir/ProposalsTwoImagesSlideLayout";
import SouvenirProposalsThreeImages, {
  Schema as SouvenirProposalsThreeImagesSchema,
  layoutId as SouvenirProposalsThreeImagesId,
  layoutName as SouvenirProposalsThreeImagesName,
  layoutDescription as SouvenirProposalsThreeImagesDescription,
} from "../../presentation-templates/souvenir/ProposalsThreeImagesSlideLayout";
import SouvenirProposalsCollageLeftRightStack, {
  Schema as SouvenirProposalsCollageLeftRightStackSchema,
  layoutId as SouvenirProposalsCollageLeftRightStackId,
  layoutName as SouvenirProposalsCollageLeftRightStackName,
  layoutDescription as SouvenirProposalsCollageLeftRightStackDescription,
} from "../../presentation-templates/souvenir/ProposalsCollageLeftRightStackSlideLayout";

import VideoTitleEventHeader, {
  Schema as VideoTitleEventHeaderSchema,
  layoutId as VideoTitleEventHeaderId,
  layoutName as VideoTitleEventHeaderName,
  layoutDescription as VideoTitleEventHeaderDescription,
} from "../../presentation-templates/video/TitleEventHeaderSlideLayout";
import VideoConceptMissionMood, {
  Schema as VideoConceptMissionMoodSchema,
  layoutId as VideoConceptMissionMoodId,
  layoutName as VideoConceptMissionMoodName,
  layoutDescription as VideoConceptMissionMoodDescription,
} from "../../presentation-templates/video/ConceptMissionMoodSlideLayout";
import VideoColorPaletteListing, {
  Schema as VideoColorPaletteListingSchema,
  layoutId as VideoColorPaletteListingId,
  layoutName as VideoColorPaletteListingName,
  layoutDescription as VideoColorPaletteListingDescription,
} from "../../presentation-templates/video/ColorPaletteListingSlideLayout";
import VideoTypographySpec, {
  Schema as VideoTypographySpecSchema,
  layoutId as VideoTypographySpecId,
  layoutName as VideoTypographySpecName,
  layoutDescription as VideoTypographySpecDescription,
} from "../../presentation-templates/video/TypographySpecSlideLayout";
import VideoStoryboardFrameDescription, {
  Schema as VideoStoryboardFrameDescriptionSchema,
  layoutId as VideoStoryboardFrameDescriptionId,
  layoutName as VideoStoryboardFrameDescriptionName,
  layoutDescription as VideoStoryboardFrameDescriptionDescription,
} from "../../presentation-templates/video/StoryboardFrameDescriptionSlideLayout";
import VideoStoryboardSplitVisual, {
  Schema as VideoStoryboardSplitVisualSchema,
  layoutId as VideoStoryboardSplitVisualId,
  layoutName as VideoStoryboardSplitVisualName,
  layoutDescription as VideoStoryboardSplitVisualDescription,
} from "../../presentation-templates/video/StoryboardSplitVisualSlideLayout";
import VideoStoryboardEventPoint, {
  Schema as VideoStoryboardEventPointSchema,
  layoutId as VideoStoryboardEventPointId,
  layoutName as VideoStoryboardEventPointName,
  layoutDescription as VideoStoryboardEventPointDescription,
} from "../../presentation-templates/video/StoryboardEventPointSlideLayout";
import VideoStoryboardClimax, {
  Schema as VideoStoryboardClimaxSchema,
  layoutId as VideoStoryboardClimaxId,
  layoutName as VideoStoryboardClimaxName,
  layoutDescription as VideoStoryboardClimaxDescription,
} from "../../presentation-templates/video/StoryboardClimaxSlideLayout";

export const cateringTemplates: TemplateWithData[] = [
  createTemplateEntry(CateringCoverKickerTitle, CateringCoverKickerTitleSchema, CateringCoverKickerTitleId, CateringCoverKickerTitleName, CateringCoverKickerTitleDescription, "catering", "CoverKickerTitleSlideLayout"),
  createTemplateEntry(CateringHeaderQuoteTwoColumns, CateringHeaderQuoteTwoColumnsSchema, CateringHeaderQuoteTwoColumnsId, CateringHeaderQuoteTwoColumnsName, CateringHeaderQuoteTwoColumnsDescription, "catering", "HeaderQuoteTwoColumnsSlideLayout"),
  createTemplateEntry(CateringHeaderColorCardsImage, CateringHeaderColorCardsImageSchema, CateringHeaderColorCardsImageId, CateringHeaderColorCardsImageName, CateringHeaderColorCardsImageDescription, "catering", "HeaderColorCardsImageSlideLayout"),
  createTemplateEntry(CateringHeaderImageFactsList, CateringHeaderImageFactsListSchema, CateringHeaderImageFactsListId, CateringHeaderImageFactsListName, CateringHeaderImageFactsListDescription, "catering", "HeaderImageFactsListSlideLayout"),
  createTemplateEntry(CateringHeaderTextBulletsImage, CateringHeaderTextBulletsImageSchema, CateringHeaderTextBulletsImageId, CateringHeaderTextBulletsImageName, CateringHeaderTextBulletsImageDescription, "catering", "HeaderTextBulletsImageSlideLayout"),
  createTemplateEntry(CateringHeaderThreeImageCards, CateringHeaderThreeImageCardsSchema, CateringHeaderThreeImageCardsId, CateringHeaderThreeImageCardsName, CateringHeaderThreeImageCardsDescription, "catering", "HeaderThreeImageCardsSlideLayout"),
  createTemplateEntry(CateringHeaderMoodboardCollage, CateringHeaderMoodboardCollageSchema, CateringHeaderMoodboardCollageId, CateringHeaderMoodboardCollageName, CateringHeaderMoodboardCollageDescription, "catering", "HeaderMoodboardCollageSlideLayout"),
];

export const decorFloristicsTemplates: TemplateWithData[] = [
  createTemplateEntry(DecorCoverTitle, DecorCoverTitleSchema, DecorCoverTitleId, DecorCoverTitleName, DecorCoverTitleDescription, "decor-floristics-template", "DecorCoverTitleSlideLayout"),
  createTemplateEntry(DecorConceptMissionKeyIdeas, DecorConceptMissionKeyIdeasSchema, DecorConceptMissionKeyIdeasId, DecorConceptMissionKeyIdeasName, DecorConceptMissionKeyIdeasDescription, "decor-floristics-template", "DecorConceptMissionKeyIdeasSlideLayout"),
  createTemplateEntry(DecorColorPalette, DecorColorPaletteSchema, DecorColorPaletteId, DecorColorPaletteName, DecorColorPaletteDescription, "decor-floristics-template", "DecorColorPaletteSlideLayout"),
  createTemplateEntry(DecorTypography, DecorTypographySchema, DecorTypographyId, DecorTypographyName, DecorTypographyDescription, "decor-floristics-template", "DecorTypographySlideLayout"),
  createTemplateEntry(DecorElementsOverview, DecorElementsOverviewSchema, DecorElementsOverviewId, DecorElementsOverviewName, DecorElementsOverviewDescription, "decor-floristics-template", "DecorElementsOverviewSlideLayout"),
  createTemplateEntry(DecorElementsAccent, DecorElementsAccentSchema, DecorElementsAccentId, DecorElementsAccentName, DecorElementsAccentDescription, "decor-floristics-template", "DecorElementsAccentSlideLayout"),
  createTemplateEntry(DecorStageDesignProposals, DecorStageDesignProposalsSchema, DecorStageDesignProposalsId, DecorStageDesignProposalsName, DecorStageDesignProposalsDescription, "decor-floristics-template", "StageDesignProposalsSlideLayout"),
  createTemplateEntry(DecorPhotozoneDesignProposals, DecorPhotozoneDesignProposalsSchema, DecorPhotozoneDesignProposalsId, DecorPhotozoneDesignProposalsName, DecorPhotozoneDesignProposalsDescription, "decor-floristics-template", "PhotozoneDesignProposalsSlideLayout"),
];

export const souvenirTemplates: TemplateWithData[] = [
  createTemplateEntry(SouvenirCoverBackgroundKickerTitle, SouvenirCoverBackgroundKickerTitleSchema, SouvenirCoverBackgroundKickerTitleId, SouvenirCoverBackgroundKickerTitleName, SouvenirCoverBackgroundKickerTitleDescription, "souvenir", "CoverBackgroundKickerTitleSlideLayout"),
  createTemplateEntry(SouvenirHeaderQuoteTwoColumnsLines, SouvenirHeaderQuoteTwoColumnsLinesSchema, SouvenirHeaderQuoteTwoColumnsLinesId, SouvenirHeaderQuoteTwoColumnsLinesName, SouvenirHeaderQuoteTwoColumnsLinesDescription, "souvenir", "HeaderQuoteTwoColumnsLinesSlideLayout"),
  createTemplateEntry(SouvenirPaletteGridImage, SouvenirPaletteGridImageSchema, SouvenirPaletteGridImageId, SouvenirPaletteGridImageName, SouvenirPaletteGridImageDescription, "souvenir", "PaletteGridImageSlideLayout"),
  createTemplateEntry(SouvenirTypographyTwoColumnsImage, SouvenirTypographyTwoColumnsImageSchema, SouvenirTypographyTwoColumnsImageId, SouvenirTypographyTwoColumnsImageName, SouvenirTypographyTwoColumnsImageDescription, "souvenir", "TypographyTwoColumnsImageSlideLayout"),
  createTemplateEntry(SouvenirMoodboardCollage4, SouvenirMoodboardCollage4Schema, SouvenirMoodboardCollage4Id, SouvenirMoodboardCollage4Name, SouvenirMoodboardCollage4Description, "souvenir", "MoodboardCollage4SlideLayout"),
  createTemplateEntry(SouvenirHeaderParagraphPatternImage, SouvenirHeaderParagraphPatternImageSchema, SouvenirHeaderParagraphPatternImageId, SouvenirHeaderParagraphPatternImageName, SouvenirHeaderParagraphPatternImageDescription, "souvenir", "HeaderParagraphPatternImageSlideLayout"),
  createTemplateEntry(SouvenirDesignElementsMultiColumn, SouvenirDesignElementsMultiColumnSchema, SouvenirDesignElementsMultiColumnId, SouvenirDesignElementsMultiColumnName, SouvenirDesignElementsMultiColumnDescription, "souvenir", "DesignElementsMultiColumnSlideLayout"),
  createTemplateEntry(SouvenirDesignElementsTextImageSwatches, SouvenirDesignElementsTextImageSwatchesSchema, SouvenirDesignElementsTextImageSwatchesId, SouvenirDesignElementsTextImageSwatchesName, SouvenirDesignElementsTextImageSwatchesDescription, "souvenir", "DesignElementsTextImageSwatchesSlideLayout"),
  createTemplateEntry(SouvenirProposalsTwoImages, SouvenirProposalsTwoImagesSchema, SouvenirProposalsTwoImagesId, SouvenirProposalsTwoImagesName, SouvenirProposalsTwoImagesDescription, "souvenir", "ProposalsTwoImagesSlideLayout"),
  createTemplateEntry(SouvenirProposalsThreeImages, SouvenirProposalsThreeImagesSchema, SouvenirProposalsThreeImagesId, SouvenirProposalsThreeImagesName, SouvenirProposalsThreeImagesDescription, "souvenir", "ProposalsThreeImagesSlideLayout"),
  createTemplateEntry(SouvenirProposalsCollageLeftRightStack, SouvenirProposalsCollageLeftRightStackSchema, SouvenirProposalsCollageLeftRightStackId, SouvenirProposalsCollageLeftRightStackName, SouvenirProposalsCollageLeftRightStackDescription, "souvenir", "ProposalsCollageLeftRightStackSlideLayout"),
];

export const videoTemplates: TemplateWithData[] = [
  createTemplateEntry(VideoTitleEventHeader, VideoTitleEventHeaderSchema, VideoTitleEventHeaderId, VideoTitleEventHeaderName, VideoTitleEventHeaderDescription, "video", "TitleEventHeaderSlideLayout"),
  createTemplateEntry(VideoConceptMissionMood, VideoConceptMissionMoodSchema, VideoConceptMissionMoodId, VideoConceptMissionMoodName, VideoConceptMissionMoodDescription, "video", "ConceptMissionMoodSlideLayout"),
  createTemplateEntry(VideoColorPaletteListing, VideoColorPaletteListingSchema, VideoColorPaletteListingId, VideoColorPaletteListingName, VideoColorPaletteListingDescription, "video", "ColorPaletteListingSlideLayout"),
  createTemplateEntry(VideoTypographySpec, VideoTypographySpecSchema, VideoTypographySpecId, VideoTypographySpecName, VideoTypographySpecDescription, "video", "TypographySpecSlideLayout"),
  createTemplateEntry(VideoStoryboardFrameDescription, VideoStoryboardFrameDescriptionSchema, VideoStoryboardFrameDescriptionId, VideoStoryboardFrameDescriptionName, VideoStoryboardFrameDescriptionDescription, "video", "StoryboardFrameDescriptionSlideLayout"),
  createTemplateEntry(VideoStoryboardSplitVisual, VideoStoryboardSplitVisualSchema, VideoStoryboardSplitVisualId, VideoStoryboardSplitVisualName, VideoStoryboardSplitVisualDescription, "video", "StoryboardSplitVisualSlideLayout"),
  createTemplateEntry(VideoStoryboardEventPoint, VideoStoryboardEventPointSchema, VideoStoryboardEventPointId, VideoStoryboardEventPointName, VideoStoryboardEventPointDescription, "video", "StoryboardEventPointSlideLayout"),
  createTemplateEntry(VideoStoryboardClimax, VideoStoryboardClimaxSchema, VideoStoryboardClimaxId, VideoStoryboardClimaxName, VideoStoryboardClimaxDescription, "video", "StoryboardClimaxSlideLayout"),
];

export const legacyFileTemplateGroups: TemplateLayoutsWithSettings[] = [
  {
    id: "catering",
    name: "Catering",
    description: cateringSettings.description,
    settings: cateringSettings as TemplateGroupSettings,
    layouts: cateringTemplates,
  },
  {
    id: "decor-floristics-template",
    name: "Decor & Floristics",
    description: decorFloristicsSettings.description,
    settings: decorFloristicsSettings as TemplateGroupSettings,
    layouts: decorFloristicsTemplates,
  },
  {
    id: "souvenir",
    name: "Souvenir",
    description: souvenirSettings.description,
    settings: souvenirSettings as TemplateGroupSettings,
    layouts: souvenirTemplates,
  },
  {
    id: "video",
    name: "Video",
    description: videoSettings.description,
    settings: videoSettings as TemplateGroupSettings,
    layouts: videoTemplates,
  },
];

export const legacyFileTemplateLayouts: TemplateWithData[] =
  legacyFileTemplateGroups.flatMap((group) => group.layouts);
