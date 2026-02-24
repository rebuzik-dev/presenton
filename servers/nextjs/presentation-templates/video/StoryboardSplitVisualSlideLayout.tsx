import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(5).max(220).meta({ description: "Image prompt text" }),
});

const layoutId = "storyboard-split-visual-slide";
const layoutName = "Storyboard Split Visual Slide";
const layoutDescription =
  "Storyboard slide: left text column + right two images, with overlay metric badge.";

const Schema = z.object({
  title: z.string().min(3).max(40).default("РАСКАДРОВКА").meta({ description: "Main slide title" }),

  phase: z.string().min(2).max(60).default("Масштаб и отбор").meta({ description: "Phase title" }),
  timing: z.string().min(5).max(20).default("1:20–2:40").meta({ description: "Timing range" }),

  // Цельные блоки, без принудительных переносов
  framesText: z
    .string()
    .min(5)
    .max(320)
    .default("Кадры: – заполнение заявок, онлайн-интервью.")
    .meta({ description: "Frames text block (single block, auto-wrap)" }),

  graphicsTextBlock: z
    .string()
    .min(5)
    .max(320)
    .default("Графика: – 500+ заявок – 16.03–01.04 – конкурсный отбор")
    .meta({ description: "Graphics text block (single block, auto-wrap)" }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Hands typing on a keyboard with digital glow",
      },
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Young IT specialists in a training lab",
      },
    ])
    .meta({ description: "Two visual storyboard frames" }),

  badgeText: z.string().min(3).max(40).default("500+ заявок").meta({ description: "Overlay badge text" }),
});

type StoryboardSplitData = z.infer<typeof Schema>;

interface StoryboardSplitProps {
  data?: Partial<StoryboardSplitData>;
}

const dynamicSlideLayout: React.FC<StoryboardSplitProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Важно: не используем "display", чтобы не улетать в серифный заголовок как на проблемном превью
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const barColor = resolveColor(slideData, "bars", "background", "#BFBFBF", "muted");

  // Бейдж как в референсе: зелёный, слегка прозрачный, белый текст
  const badgeBg = resolveColor(slideData, "badge", "background", "#2BAE98", "accent");
  const badgeTextColor = resolveColor(slideData, "badge", "color", "#FFFFFF", "on_accent");

  const visuals = slideData?.visuals || [];
  const img1 = visuals[0]?.__image_url__;
  const img2 = visuals[1]?.__image_url__;

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      {/* Серые полосы сверху/снизу как в PPT-референсе */}
      <div className="absolute left-0 top-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />
      <div className="absolute left-0 bottom-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />

      <div className="relative h-full px-[48px] pt-[40px] pb-[40px]">
        <div className="h-full grid grid-cols-[0.38fr_0.62fr] gap-[44px]">
          {/* Левая колонка — текст */}
          <div className="flex flex-col">
            <div
              className="uppercase font-[800] text-[44px] leading-[52px]"
              style={{ color: titleColor, fontFamily: titleFont }}
            >
              {slideData?.title || "РАСКАДРОВКА"}
            </div>

            <div
              className="mt-[18px] font-[800] text-[22px] leading-[28px]"
              style={{ color: titleColor, fontFamily: bodyFont }}
            >
              {(slideData?.phase || "Масштаб и отбор") + " (" + (slideData?.timing || "1:20–2:40") + ")"}
            </div>

            {/* Блоки текста — цельные строки, без ручных переносов */}
            <div className="mt-[86px] space-y-[44px]">
              <div
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.framesText || "Кадры: – заполнение заявок, онлайн-интервью."}
              </div>

              <div
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.graphicsTextBlock || "Графика: – 500+ заявок – 16.03–01.04 – конкурсный отбор"}
              </div>
            </div>

            <div className="mt-auto" />
          </div>

          {/* Правая колонка — 2 изображения рядом */}
          <div className="flex h-full items-center">
            <div className="w-full grid grid-cols-2 gap-[22px]">
              {/* Изображение 1 */}
              <div className="w-full h-[360px] bg-black/5">
                {img1 ? (
                  <img
                    src={img1}
                    alt={visuals[0]?.__image_prompt__ || "Storyboard image 1"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>

              {/* Изображение 2 + бейдж */}
              <div className="relative w-full h-[360px] bg-black/5">
                {img2 ? (
                  <img
                    src={img2}
                    alt={visuals[1]?.__image_prompt__ || "Storyboard image 2"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}

                <div
                  className="absolute bottom-[18px] left-1/2 -translate-x-1/2 px-[28px] py-[12px] rounded-[12px] font-[800] text-[26px] leading-[30px]"
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeTextColor,
                    fontFamily: bodyFont,
                    opacity: 0.9,
                  }}
                >
                  {slideData?.badgeText || "500+ заявок"}
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