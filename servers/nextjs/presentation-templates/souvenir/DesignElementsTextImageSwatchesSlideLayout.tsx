import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z
    .string()
    .url()
    .default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"),
  __image_prompt__: z.string().min(3).max(220).default("Design element image"),
});

const layoutId = "design-elements-text-image-swatches-slide";
const layoutName = "Design Elements Text + Stacked Images Slide";
const layoutDescription = "Left 2 text blocks + right 2 stacked images (no overflow).";

const Schema = z.object({
  title: z.string().min(3).max(60).default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА"),

  topText: z
    .string()
    .min(10)
    .max(260)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Top text block" }),

  bottomText: z
    .string()
    .min(10)
    .max(260)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Bottom text block" }),

  topImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Close-up decor detail (candles, texture, floristics), premium editorial photo",
  }),

  bottomImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Wide main decor scene (overall composition), premium editorial photo",
  }),
});

type Data = z.infer<typeof Schema>;

interface Props {
  data?: Partial<Data>;
}

const dynamicSlideLayout: React.FC<Props> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // чтобы не уезжать в серифный display
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#F3F1EE", "surface");
  const dividerColor = resolveColor(slideData, "divider", "background", "rgba(47,47,47,0.18)", "surface");

  const topImg =
    slideData?.topImage?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";
  const bottomImg =
    slideData?.bottomImage?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";

  return (
    <div
      className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white z-20 mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      {/* ВАЖНО: делаем общий контейнер flex-col, чтобы тело точно влезало */}
      <div className="h-full px-16 pt-10 pb-12 flex flex-col min-h-0">
        {/* Title */}
        <div
          className="text-[48px] leading-[54px] font-[900] uppercase"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА"}
        </div>

        {/* Body занимает оставшуюся высоту и НЕ даёт детям распирать контейнер */}
        <div className="mt-6 flex-1 min-h-0 grid grid-cols-[0.85fr_1.15fr] gap-10">
          {/* LEFT: 2 явно отделённых блока */}
          <div className="flex flex-col justify-start gap-10 min-h-0 pt-2">
            <div>
              <div
                className="text-[16px] leading-[22px] font-[500]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.topText}
              </div>

              {/* тонкий разделитель (можно убрать, если не нужен) */}
              <div className="mt-6 h-px w-[140px]" style={{ backgroundColor: dividerColor }} />
            </div>

            <div>
              <div
                className="text-[16px] leading-[22px] font-[500]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.bottomText}
              </div>
            </div>
          </div>

          {/* RIGHT: 2 изображения строго внутри высоты */}
          <div className="flex flex-col gap-6 min-h-0">
            {/* Верхнее: фиксированная доля высоты, чтобы гарантированно влезало */}
            <div
              className="overflow-hidden rounded-[10px] bg-[var(--style-surface)]"
              style={{ backgroundColor: surfaceColor, flex: "0 0 38%" }}
            >
              <img
                src={topImg}
                alt={slideData?.topImage?.__image_prompt__ || "top image"}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Нижнее: занимает остаток */}
            <div
              className="overflow-hidden rounded-[10px] bg-[var(--style-surface)] min-h-0"
              style={{ backgroundColor: surfaceColor, flex: "1 1 0%" }}
            >
              <img
                src={bottomImg}
                alt={slideData?.bottomImage?.__image_prompt__ || "bottom image"}
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