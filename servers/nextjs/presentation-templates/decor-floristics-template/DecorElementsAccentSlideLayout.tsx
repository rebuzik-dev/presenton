import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(260).meta({ description: "Image prompt text" }),
});

const layoutId = "storyboard-split-visual-slide";
const layoutName = "Decor Elements Wide Image Slide";
const layoutDescription =
  "Reference-like decor slide: title on top, left wide floristics image, right two text paragraphs.";

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА")
    .meta({ description: "Main slide title" }),

  // 2 цельных текстовых блока (как в рефе)
  textTop: z
    .string()
    .min(20)
    .max(520)
    .default(
      "Главный акцент — объёмные композиции из мимозы с зеленью, интегрированные у основания арки и по бокам, а также группы свечей разной высоты в стеклянных подсвечниках."
    )
    .meta({ description: "Top paragraph (single block, auto-wrap)" }),

  textBottom: z
    .string()
    .min(20)
    .max(520)
    .default(
      "Палитра строится на сочетании бирюзовой базы, мимозного жёлтого акцента и молочно-белых деталей, создавая торжественный, весенний и официальный образ."
    )
    .meta({ description: "Bottom paragraph (single block, auto-wrap)" }),

  // В референсе одно большое изображение слева
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Premium event decor scene with mimosa floristry: turquoise-blue matte backdrop, warm cream-gold circular arch with soft backlight, clusters of candles in glass holders of different heights, neutral round podium and cylindrical pedestals, abundant yellow mimosa with green foliage, soft daylight, high-end editorial photo, no people, clean composition",
  }).meta({ description: "Left wide decor image" }),
});

type DecorSplitData = z.infer<typeof Schema>;

interface DecorSplitProps {
  data?: Partial<DecorSplitData>;
}

const dynamicSlideLayout: React.FC<DecorSplitProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Важно: не display
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

        {/* Content */}
        <div className="mt-[34px] grid grid-cols-[0.68fr_0.32fr] gap-[34px] items-start">
          {/* Left: large wide image */}
          <div className="w-full">
            <div className="w-full h-[470px] overflow-hidden bg-black/5">
              <img
                src={imgUrl}
                alt={slideData?.image?.__image_prompt__ || "Decor floristics"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: text (2 paragraphs) */}
          <div className="pt-[10px]">
            <div
              className="text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.textTop ||
                "Главный акцент — объёмные композиции из мимозы с зеленью, интегрированные у основания арки и по бокам, а также группы свечей разной высоты в стеклянных подсвечниках."}
            </div>

            <div
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.textBottom ||
                "Палитра строится на сочетании бирюзовой базы, мимозного жёлтого акцента и молочно-белых деталей, создавая торжественный, весенний и официальный образ."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;