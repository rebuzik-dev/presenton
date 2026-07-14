import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(5).max(220).meta({ description: "Один кадр развития истории; соседний слот должен показывать другой план, действие или реакцию." }),
});

const layoutId = "storyboard-split-visual-slide";
const layoutName = "Storyboard Split Visual Slide";
const layoutDescription =
  "Развитие видеосюжета: следующий драматургический этап, визуальный ряд, графика и два различающихся кадра с опциональным смысловым бейджем.";

const Schema = z.object({
  title: z.string().min(3).max(40).default("РАСКАДРОВКА").meta({ description: "Заголовок раздела с раскадровкой." }),

  phase: z.string().min(2).max(60).default("Развитие истории").meta({ description: "Название этапа, следующего за хуком, в драматургии конкретного ролика." }),
  timing: z.string().min(5).max(20).default("Без таймкода").meta({ description: "Точный интервал только из длительности или сценария брифа; иначе «Без таймкода»." }),

  // Цельные блоки, без принудительных переносов
  framesText: z
    .string()
    .min(5)
    .max(320)
    .default("Кадры: действие развивается, раскрывая героя, продукт, место или процесс, заданный брифом.")
    .meta({ description: "Описание последовательности кадров этого этапа. Творческие переходы допустимы, факты и участники — только из брифа." }),

  graphicsTextBlock: z
    .string()
    .min(5)
    .max(320)
    .default("Графика: титры, факты или визуальные акценты поддерживают развитие сюжета.")
    .meta({ description: "Экранная графика и факты. Даты, числа, названия и метрики использовать только при наличии в брифе." }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Основное действие этапа развития истории в контексте проекта и среды из брифа",
      },
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Деталь, альтернативный ракурс или эмоциональная реакция, дополняющая основное действие этого этапа",
      },
    ])
    .meta({ description: "Ровно два связанных, но визуально разных кадра одного этапа: действие и дополняющий план." }),

  badgeText: z.string().min(3).max(40).default("Развитие").meta({ description: "Короткий смысловой акцент; метрику использовать только при её наличии в брифе." }),
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
              {...promptTargetAttrs({
                path: "title",
                type: "field",
                name: "Title",
                description: "Заголовок раздела с раскадровкой",
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
                  description: "Название драматургического этапа",
                })}
              >
                {slideData?.phase || "Развитие истории"}
              </span>{" "}
              (<span
                {...promptTargetAttrs({
                  path: "timing",
                  type: "field",
                  name: "Timing",
                  description: "Интервал этапа при наличии длительности",
                })}
              >
                {slideData?.timing || "Без таймкода"}
              </span>)
            </div>

            {/* Блоки текста — цельные строки, без ручных переносов */}
            <div className="mt-[86px] space-y-[44px]">
              <div
                {...promptTargetAttrs({
                  path: "framesText",
                  type: "field",
                  name: "Frames text",
                  description: "Описание действия и композиции кадров",
                })}
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.framesText || "Кадры: действие развивается, раскрывая героя, продукт, место или процесс, заданный брифом."}
              </div>

              <div
                {...promptTargetAttrs({
                  path: "graphicsTextBlock",
                  type: "field",
                  name: "Graphics text",
                  description: "Описание графики и экранных элементов",
                })}
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.graphicsTextBlock || "Графика: титры, факты или визуальные акценты поддерживают развитие сюжета."}
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
                    {...promptTargetAttrs({
                      path: `visuals[${0}].__image_prompt__`,
                      type: "image",
                      name: "Storyboard image 1",
                      description: "ТЗ главного плана эпизода",
                    })}
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
                    {...promptTargetAttrs({
                      path: `visuals[${1}].__image_prompt__`,
                      type: "image",
                      name: "Storyboard image 2",
                      description: "ТЗ отдельного детального или альтернативного плана",
                    })}
                    src={img2}
                    alt={visuals[1]?.__image_prompt__ || "Storyboard image 2"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}

                <div
                  {...promptTargetAttrs({
                    path: "badgeText",
                    type: "field",
                    name: "Badge text",
                    description: "Короткая подпись драматургического этапа",
                  })}
                  className="absolute bottom-[18px] left-1/2 -translate-x-1/2 px-[28px] py-[12px] rounded-[12px] font-[800] text-[26px] leading-[30px]"
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeTextColor,
                    fontFamily: bodyFont,
                    opacity: 0.9,
                  }}
                >
                  {slideData?.badgeText || "Развитие"}
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
