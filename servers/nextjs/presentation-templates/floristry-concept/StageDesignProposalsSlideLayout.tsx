import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(360).meta({
    description:
      "Визуал сцены по брифу: первый кадр широкий, второй — связанный вертикальный ракурс или деталь. Не придумывать символы, людей, логотипы, текст, цветы и конструкции.",
  }),
});

const layoutId = "storyboard-event-point-slide";
const layoutName = "Stage Design Proposals Slide";
const layoutDescription =
  "Флористическое решение для ключевой зоны: широкий общий вид и связанный вертикальный ракурс или деталь. Конкретную зону выбирать только по брифу."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(80)
    .default("ФЛОРИСТИКА КЛЮЧЕВОЙ ЗОНЫ")
    .meta({
      description:
        "Заголовок предложения по сцене. Сохранять универсальным, если бриф не задаёт конкретную зону, формат или название.",
    }),

  leftLabel: z
    .string()
    .min(2)
    .max(20)
    .default("Ключевая зона")
    .meta({
      description:
        "Короткая подпись на левом изображении; уточнять название зоны только по брифу.",
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
        "Два связанных кадра одной концепции: широкий вид сцены и вертикальный альтернативный ракурс или деталь."
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
            description: "Заголовок флористического решения для ключевой зоны",
          })}
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ФЛОРИСТИКА КЛЮЧЕВОЙ ЗОНЫ"}
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
                  description: "Широкий общий вид сцены",
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
                description: "Короткая подпись сцены",
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
                  description: "Вертикальный ракурс или деталь сцены",
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
