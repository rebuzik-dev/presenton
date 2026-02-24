import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(260).meta({ description: "Image prompt" }),
});

const layoutId = "decor-elements-slide";
const layoutName = "Decor Elements Slide";
const layoutDescription =
  "Reference-like: title on top, left description blocks, right wide decor/floristics image.";

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА")
    .meta({ description: "Slide title" }),

  // 2 цельных текстовых блока (не бьём разметкой)
  descriptionTop: z
    .string()
    .min(20)
    .max(420)
    .default(
      "Декор оформлен в сдержанной статусной стилистике: матовый бирюзово-голубой фон, круглая арка в тёплом кремово-золотистом оттенке с мягкой подсветкой, светлый круглый подиум и цилиндрические пьедесталы в нейтральной гамме."
    )
    .meta({ description: "Top description paragraph (single block)" }),

  descriptionBottom: z
    .string()
    .min(10)
    .max(260)
    .default(
      "Композицию дополняют драпировки в приглушенном бирюзовом цвете и белые элементы айдентики на фоне."
    )
    .meta({ description: "Bottom description paragraph (single block)" }),

  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Elegant event decor scene in restrained premium style: matte turquoise-blue backdrop, warm cream-gold circular arch with soft backlight, light round podium and cylindrical pedestals in neutral tones, abundant mimosa floristry with yellow blooms and green leaves, soft daylight, high-end editorial photo, no people, clean композиция",
  }).meta({ description: "Right-side decor image" }),
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
                "Декор оформлен в сдержанной статусной стилистике: матовый бирюзово-голубой фон, круглая арка..."}
            </div>

            <div
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionBottom ||
                "Композицию дополняют драпировки в приглушенном бирюзовом цвете..."}
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