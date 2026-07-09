import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(360).meta({
    description:
      "Stage visual prompt based on the brief. The first image should be a wide view; the second a related vertical alternate angle or detail. Do not invent fixed symbols, people, logos, text, flowers, or constructions.",
  }),
});

const layoutId = "storyboard-event-point-slide";
const layoutName = "Stage Design Proposals Slide";
const layoutDescription =
  "Brief-driven stage proposal slide with two related images: a wide stage view and a vertical alternate angle or detail using only supported event, venue, palette, material, floral, lighting, and mood inputs.";

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(80)
    .default("ПРЕДЛОЖЕНИЯ ПО ОФОРМЛЕНИЮ СЦЕНЫ")
    .meta({
      description:
        "Main title for stage design proposals. Keep universal unless the brief names a specific stage zone, format, or event title.",
    }),

  leftLabel: z
    .string()
    .min(2)
    .max(20)
    .default("Сцена")
    .meta({
      description:
        "Small overlay label for the left stage image, based on the brief if a more specific zone name is given.",
    }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg",
        __image_prompt__:
          "Wide stage design proposal based on the brief: venue context, stage scale, coherent palette, materials, floristics, lighting, focal elements, event mood, no unsupported text or logos",
      },
      {
        __image_url__: "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg",
        __image_prompt__:
          "Vertical alternate stage angle or detail tied to the same brief: matching palette, materials, floristics, lighting, focal element, venue mood, no unsupported people, text, or logos",
      },
    ])
    .meta({
      description:
        "Two related stage proposal visuals. visuals[0] is a wide stage view; visuals[1] is a vertical alternate angle or detail of the same concept. Keep both consistent with the brief.",
    }),
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
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Stage proposals title",
          })}
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
                {...promptTargetAttrs({
                  path: `visuals[${0}].__image_prompt__`,
                  type: "image",
                  name: "Stage proposal image 1",
                  description: "Wide stage visual prompt",
                })}
                src={imgLeft}
                alt={visuals[0]?.__image_prompt__ || "Stage proposal wide"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}

            {/* Overlay label "Сцена" */}
            <div
              {...promptTargetAttrs({
                path: "leftLabel",
                type: "field",
                name: "Left label",
                description: "Overlay label for the left stage image",
              })}
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
                {...promptTargetAttrs({
                  path: `visuals[${1}].__image_prompt__`,
                  type: "image",
                  name: "Stage proposal image 2",
                  description: "Vertical stage visual prompt",
                })}
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
