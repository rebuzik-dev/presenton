import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(360).meta({
    description:
      "Визуал фотозоны по брифу: первый кадр широкий, второй — связанный вертикальный ракурс или деталь. Не придумывать цветы, символы, людей, логотипы, текст, цвета и конструкции.",
  }),
});

const layoutId = "photozone-proposals-slide";
const layoutName = "Photozone Design Proposals Slide";
const layoutDescription =
  "Предложение по оформлению фотозоны: широкий общий вид и связанный вертикальный ракурс или деталь по данным брифа."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(80)
    .default("ПРЕДЛОЖЕНИЯ ПО ОФОРМЛЕНИЮ ФОТОЗОНЫ")
    .meta({
      description:
        "Заголовок предложения по фотозоне. Уточнять название зоны и формат только по брифу.",
    }),

  leftLabel: z
    .string()
    .min(2)
    .max(30)
    .default("Фотозона")
    .meta({
      description:
        "Короткая подпись на левом изображении; использовать более точное название только из брифа.",
    }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
        __image_prompt__:
          "Wide photozone design proposal based on the brief: overall composition, venue context, coherent palette, materials, floristics, lighting, photo-friendly focal point, no unsupported text or logos",
      },
      {
        __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
        __image_prompt__:
          "Vertical or detailed photozone angle tied to the same brief: matching palette, materials, floristics, lighting, focal point, venue mood, no unsupported people, text, or logos",
      },
    ])
    .meta({
      description:
        "Два связанных кадра одной концепции: широкий вид фотозоны и вертикальный ракурс или деталь."
    }),
});

type PhotozoneSlideData = z.infer<typeof Schema>;

interface PhotozoneSlideProps {
  data?: Partial<PhotozoneSlideData>;
}

const dynamicSlideLayout: React.FC<PhotozoneSlideProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");
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
            description: "Заголовок предложения по оформлению фотозоны",
          })}
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ПРЕДЛОЖЕНИЯ ПО ОФОРМЛЕНИЮ ФОТОЗОНЫ"}
        </div>

        {/* Images */}
        <div className="mt-[34px] grid grid-cols-[0.68fr_0.32fr] gap-[22px] items-start">
          {/* Left wide image */}
          <div className="relative w-full h-[470px] bg-black/5 overflow-hidden">
            {imgLeft ? (
              <img
                {...promptTargetAttrs({
                  path: `visuals[${0}].__image_prompt__`,
                  type: "image",
                  name: "Photozone image 1",
                  description: "Широкий общий вид фотозоны",
                })}
                src={imgLeft}
                alt={visuals[0]?.__image_prompt__ || "Photozone wide"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}

            {/* Overlay label */}
            <div
              {...promptTargetAttrs({
                path: "leftLabel",
                type: "field",
                name: "Left label",
                description: "Короткая подпись фотозоны",
              })}
              className="absolute top-[14px] left-[16px] text-[18px] leading-[22px] font-[600]"
              style={{ color: labelColor, fontFamily: labelFont }}
            >
              {slideData?.leftLabel || "Фотозона"}
            </div>
          </div>

          {/* Right vertical image */}
          <div className="w-full h-[470px] bg-black/5 overflow-hidden">
            {imgRight ? (
              <img
                {...promptTargetAttrs({
                  path: `visuals[${1}].__image_prompt__`,
                  type: "image",
                  name: "Photozone image 2",
                  description: "Вертикальный ракурс или деталь фотозоны",
                })}
                src={imgRight}
                alt={visuals[1]?.__image_prompt__ || "Photozone vertical"}
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
