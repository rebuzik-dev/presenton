import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(5).max(220).meta({ description: "Prompt for the image" }),
});

const layoutId = "storyboard-event-point-slide";
const layoutName = "Storyboard Event Point Slide";
const layoutDescription =
  "Storyboard: left text column + right two images, with overlay metric badge.";

const Schema = z.object({
  title: z.string().min(3).max(40).default("РАСКАДРОВКА").meta({ description: "Main slide title" }),

  phase: z
    .string()
    .min(2)
    .max(60)
    .default("Точка сборки")
    .meta({ description: "Video phase title" }),

  timing: z
    .string()
    .min(5)
    .max(20)
    .default("2:40–4:00")
    .meta({ description: "Timing interval" }),

  // Цельный блок текста (без ручного разбиения на строки в разметке)
  framesText: z
    .string()
    .min(10)
    .max(420)
    .default("Кадры: регистрация, бейджи, серверные, мастер-классы.")
    .meta({ description: "Frames description block (single block, auto-wrap)" }),

  // Цельный блок графики (может включать дату и метрику в одном поле, если нужно)
  graphicsTextBlock: z
    .string()
    .min(5)
    .max(220)
    .default("Графика: 300 профессионалов, 15–16 апреля 2026")
    .meta({ description: "Graphics block (single block, auto-wrap)" }),

  // Для бейджа на фото — отдельное поле
  badgeText: z
    .string()
    .min(3)
    .max(40)
    .default("300 профессионалов")
    .meta({ description: "Overlay metric text on photo" }),

  dateText: z
    .string()
    .min(5)
    .max(40)
    .default("15–16 апреля 2026")
    .meta({ description: "Optional date string" }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "People at event registration desk receiving badges",
      },
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "IT specialist giving a workshop in a modern room",
      },
    ])
    .meta({ description: "Two storyboard visuals" }),
});

type StoryboardEventPointData = z.infer<typeof Schema>;

interface StoryboardEventPointProps {
  data?: Partial<StoryboardEventPointData>;
}

const dynamicSlideLayout: React.FC<StoryboardEventPointProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Не используем "display", чтобы не получить серифный заголовок
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const barColor = resolveColor(slideData, "bars", "background", "#BFBFBF", "muted");

  // Бейдж как в референсах: зелёный, немного прозрачный, белый текст
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
      {/* Серые полосы сверху/снизу */}
      <div className="absolute left-0 top-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />
      <div className="absolute left-0 bottom-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />

      <div className="relative h-full px-[48px] pt-[40px] pb-[40px]">
        <div className="h-full grid grid-cols-[0.38fr_0.62fr] gap-[44px]">
          {/* Левая колонка — текст */}
          <div className="flex flex-col">
            <div
              {...promptTargetAttrs({
                path: "title",
                type: "field",
                name: "Title",
                description: "Main storyboard title",
              })}
              className="uppercase font-[800] text-[44px] leading-[52px]"
              style={{ color: titleColor, fontFamily: titleFont }}
            >
              {slideData?.title || "РАСКАДРОВКА"}
            </div>

            <div
              className="mt-[18px] font-[800] text-[22px] leading-[28px]"
              style={{ color: titleColor, fontFamily: bodyFont }}
            >
              <span
                {...promptTargetAttrs({
                  path: "phase",
                  type: "field",
                  name: "Phase",
                  description: "Storyboard phase title",
                })}
              >
                {slideData?.phase || "Точка сборки"}
              </span>{" "}
              (<span
                {...promptTargetAttrs({
                  path: "timing",
                  type: "field",
                  name: "Timing",
                  description: "Storyboard timing interval",
                })}
              >
                {slideData?.timing || "2:40–4:00"}
              </span>)
            </div>

            <div className="mt-[86px] space-y-[44px]">
              <div
                {...promptTargetAttrs({
                  path: "framesText",
                  type: "field",
                  name: "Frames text",
                  description: "Frames description block",
                })}
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.framesText || "Кадры: регистрация, бейджи, серверные, мастер-классы."}
              </div>

              <div
                {...promptTargetAttrs({
                  path: "graphicsTextBlock",
                  type: "field",
                  name: "Graphics text",
                  description: "Graphics block",
                })}
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.graphicsTextBlock || "Графика: 300 профессионалов, 15–16 апреля 2026"}
              </div>

              {/* Если хочешь держать дату отдельно — это отдельный блок, тоже цельный */}
              {/* <div
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.dateText || "15–16 апреля 2026"}
              </div> */}
            </div>

            <div className="mt-auto" />
          </div>

          {/* Правая колонка — 2 изображения рядом */}
          <div className="flex h-full items-center">
            <div className="w-full grid grid-cols-2 gap-[22px]">
              <div className="w-full h-[360px] bg-black/5">
                {img1 ? (
                  <img
                    {...promptTargetAttrs({
                      path: `visuals[${0}].__image_prompt__`,
                      type: "image",
                      name: "Storyboard image 1",
                      description: "First storyboard visual prompt",
                    })}
                    src={img1}
                    alt={visuals[0]?.__image_prompt__ || "Storyboard image 1"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>

              <div className="relative w-full h-[360px] bg-black/5">
                {img2 ? (
                  <img
                    {...promptTargetAttrs({
                      path: `visuals[${1}].__image_prompt__`,
                      type: "image",
                      name: "Storyboard image 2",
                      description: "Second storyboard visual prompt",
                    })}
                    src={img2}
                    alt={visuals[1]?.__image_prompt__ || "Storyboard image 2"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}

                {/* Бейдж внизу по центру */}
                <div
                  {...promptTargetAttrs({
                    path: "badgeText",
                    type: "field",
                    name: "Badge text",
                    description: "Overlay metric text",
                  })}
                  className="absolute bottom-[18px] left-1/2 -translate-x-1/2 px-[28px] py-[12px] rounded-[12px] font-[800] text-[26px] leading-[30px]"
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeTextColor,
                    fontFamily: bodyFont,
                    opacity: 0.9,
                  }}
                >
                  {slideData?.badgeText || "300 профессионалов"}
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
