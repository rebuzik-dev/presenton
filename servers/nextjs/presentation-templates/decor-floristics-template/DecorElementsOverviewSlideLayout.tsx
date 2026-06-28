import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(320).meta({
    description:
      "Main decor scene prompt based on the brief. Include relevant event type, venue, palette, materials, floristics, lighting, and mood only; do not invent fixed objects, people, symbols, or logos.",
  }),
});

const layoutId = "decor-elements-slide";
const layoutName = "Decor Elements Slide";
const layoutDescription =
  "Brief-driven decor elements slide: title, two text blocks, and a main scene image describing the spatial, material, floral, lighting, and styling decisions supported by the brief.";

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА")
    .meta({
      description:
        "Universal section title for decor elements. Do not mention a specific occasion, flower, palette, or construction unless required by the brief.",
    }),

  // 2 цельных текстовых блока (не бьём разметкой)
  descriptionTop: z
    .string()
    .min(20)
    .max(420)
    .default(
      "Основные пространственные элементы выбираются из задач брифа: зона встречи, сцена, фотозона, проходы, столы, навигация или другие ключевые точки оформляются в единой стилистике события."
    )
    .meta({
      description:
        "Describe the main architectural or spatial decor elements from the brief. Include forms, zones, scale, venue constraints, and function only when supported.",
    }),

  descriptionBottom: z
    .string()
    .min(10)
    .max(260)
    .default(
      "Дополнительные решения раскрываются через материалы, фактуры, флористику, свет, текстиль, мебель и малые детали, которые поддерживают настроение и формат мероприятия."
    )
    .meta({
      description:
        "Describe secondary decor layers: materials, floristics, lighting, textile, furniture, props, print, and details from the brief. Avoid unsupported specifics.",
    }),

  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Main event decor scene based on the brief: relevant venue zone, coherent palette, materials, floristics, lighting, scale, and mood, high-end editorial interior/event photo",
  }).meta({
    description:
      "Right-side decor image prompt. Use the brief as source of truth and keep it consistent with palette, materials, floristics, and mood across the presentation.",
  }),
});

type DecorElementsData = z.infer<typeof Schema>;

interface DecorElementsProps {
  data?: Partial<DecorElementsData>;
}

const dynamicSlideLayout: React.FC<DecorElementsProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const imgUrl =
    slideData?.image?.__image_url__ || "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg";

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
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА"}
        </div>

        {/* Content row */}
        <div className="mt-[34px] grid grid-cols-[0.34fr_0.66fr] gap-[34px] items-start">
          {/* Left text */}
          <div className="pt-[6px]">
            <div
              className="text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionTop ||
                "Основные пространственные элементы выбираются из задач брифа..."}
            </div>

            <div
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionBottom ||
                "Дополнительные решения раскрываются через материалы, фактуры, флористику и свет..."}
            </div>
          </div>

          {/* Right wide image */}
          <div className="w-full">
            <div className="w-full h-[460px] overflow-hidden">
              <img
                src={imgUrl}
                alt={slideData?.image?.__image_prompt__ || "Decor floristics"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
