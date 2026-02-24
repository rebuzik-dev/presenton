import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(320).meta({ description: "Prompt for the image" }),
});

const layoutId = "storyboard-event-point-slide";
const layoutName = "Stage Design Proposals Slide";
const layoutDescription =
  "Reference-like: big title on top, two images below (left wide + right tall). Small overlay label on left image.";

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(80)
    .default("ПРЕДЛОЖЕНИЯ ПО ОФОРМЛЕНИЮ СЦЕНЫ")
    .meta({ description: "Main slide title" }),

  leftLabel: z
    .string()
    .min(2)
    .max(20)
    .default("Сцена")
    .meta({ description: "Small label on the left image" }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg",
        __image_prompt__:
          "Wide stage design proposal for March 8 ceremony: turquoise-blue backdrop, large warm cream-gold circular arch with soft backlight, abundant mimosa floristry arrangements on both sides and along the front edge, draped turquoise fabric, candles in glass holders, audience view, professional stage lighting, festive official look, no text, no logos, high-end editorial photo",
      },
      {
        __image_url__: "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg",
        __image_prompt__:
          "Vertical close-up stage design proposal for March 8 award ceremony: turquoise-blue backdrop with warm cream-gold circular arch, mimosa floristry clusters, candles in glass holders, presenters on stage receiving awards, official festive atmosphere, professional photography, no text, no logos, high detail, vertical composition",
      },
    ])
    .meta({ description: "Two stage proposal visuals: left wide, right tall" }),
});

type StageProposalsData = z.infer<typeof Schema>;

interface StageProposalsProps {
  data?: Partial<StageProposalsData>;
}

const dynamicSlideLayout: React.FC<StageProposalsProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Не display — чтобы не улетать в сериф
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const labelFont = resolveFontFamily(slideData, "label", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const labelColor = resolveColor(slideData, "label", "color", "rgba(255,255,255,0.92)", "on_image");

  const visuals = slideData?.visuals || [];
  const imgLeft = visuals[0]?.__image_url__;
  const imgRight = visuals[1]?.__image_url__;

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="h-full px-[56px] pt-[42px] pb-[42px]">
        {/* Title */}
        <div
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ПРЕДЛОЖЕНИЯ ПО ОФОРМЛЕНИЮ СЦЕНЫ"}
        </div>

        {/* Images row */}
        <div className="mt-[34px] grid grid-cols-[0.68fr_0.32fr] gap-[22px] items-start">
          {/* Left wide image */}
          <div className="relative w-full h-[470px] bg-black/5 overflow-hidden">
            {imgLeft ? (
              <img
                src={imgLeft}
                alt={visuals[0]?.__image_prompt__ || "Stage proposal wide"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}

            {/* Overlay label "Сцена" */}
            <div
              className="absolute top-[14px] left-[16px] text-[18px] leading-[22px] font-[600]"
              style={{ color: labelColor, fontFamily: labelFont }}
            >
              {slideData?.leftLabel || "Сцена"}
            </div>
          </div>

          {/* Right tall image */}
          <div className="w-full h-[470px] bg-black/5 overflow-hidden">
            {imgRight ? (
              <img
                src={imgRight}
                alt={visuals[1]?.__image_prompt__ || "Stage proposal vertical"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;