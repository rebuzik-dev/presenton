import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z
    .string()
    .url()
    .default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg")
    .meta({ description: "URL to image" }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Overview photo")
    .meta({ description: "Prompt used to generate the image" }),
});

const layoutId = "header-image-facts-list-slide";
const layoutName = "Header Image Facts List Slide";
const layoutDescription = "Static title + image left + right text blocks (AI-filled).";

// ✅ Заголовки не заполняются ИИ — поэтому title/listTitle убраны из Schema
const Schema = z.object({
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Catering overview photo",
  }).meta({ description: "Main image" }),

  // ✅ ЦЕЛЬНЫЙ блок под факты (ИИ заполняет одним текстом)
  factsText: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Количество человек: 200 человек. Выход еды на человека: 700 гр./человек. Выход напитков на человека: 400 гр./человек."
    )
    .meta({ description: "Facts block (single text, auto-wrap)" }),

  // ✅ ЦЕЛЬНЫЙ блок под ассортимент (ИИ заполняет одним текстом)
  assortmentText: z
    .string()
    .min(10)
    .max(420)
    .default("Горячие – 2 вида. Салаты – 3 вида. Закуски – 3 вида. Десерты – 2 вида.")
    .meta({ description: "Assortment block (single text, auto-wrap)" }),
});

type HeaderImageFactsListSlideData = z.infer<typeof Schema>;

interface Props {
  data?: Partial<HeaderImageFactsListSlideData>;
}

const dynamicSlideLayout: React.FC<Props> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // 🔧 Чтобы не уходить в “серифный display”
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary");
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface");

  return (
    <div
      className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white z-20 mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="h-full px-[72px] pt-12 pb-12">
        {/* ✅ Статичный заголовок — не из данных */}
        <div
          className="text-[52px] leading-[58px] font-[900] uppercase tracking-[0.2px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          ОБЩАЯ ИНФОРМАЦИЯ
        </div>

        <div className="mt-8 grid grid-cols-[1.45fr_0.85fr] gap-10 items-start">
          {/* Image */}
          <div className="w-full h-[472px] overflow-hidden" style={{ backgroundColor: surfaceColor }}>
            <img
              src={
                slideData?.image?.__image_url__ ||
                "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
              }
              alt={slideData?.image?.__image_prompt__ || "Overview"}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right text blocks */}
          <div className="pt-1 max-h-[472px] overflow-hidden">
            {/* ✅ Заголовки секций статичные */}
            <div className="space-y-8">
              <div>
                <div
                  className="text-[22px] leading-[28px] font-[800]"
                  style={{ color: titleColor, fontFamily: bodyFont }}
                >
                  Количество человек / нормы
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                >
                  {slideData?.factsText ||
                    "Количество человек: 200 человек. Выход еды на человека: 700 гр./человек. Выход напитков на человека: 400 гр./человек."}
                </div>
              </div>

              <div>
                <div
                  className="text-[22px] leading-[28px] font-[800]"
                  style={{ color: titleColor, fontFamily: bodyFont }}
                >
                  Ассортимент
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                >
                  {slideData?.assortmentText ||
                    "Горячие – 2 вида. Салаты – 3 вида. Закуски – 3 вида. Десерты – 2 вида."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;