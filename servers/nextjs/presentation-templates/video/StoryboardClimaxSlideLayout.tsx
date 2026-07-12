import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(220).meta({ description: "Один кадр кульминации или финала; соседний слот должен показывать другой план или эмоциональный отклик." }),
});

const layoutId = "storyboard-climax-slide";
const layoutName = "Storyboard Climax Slide";
const layoutDescription =
  "Кульминация и финал раскадровки: главное действие, эмоциональный результат, финальный посыл и два разных кадра без фиксированного типа события."

const Schema = z.object({
  title: z.string().min(3).max(40).default("РАСКАДРОВКА").meta({ description: "Заголовок раздела с раскадровкой." }),

  phase: z.string().min(2).max(40).default("Кульминация и финал").meta({ description: "Название кульминационного или финального этапа истории." }),

  timing: z.string().min(5).max(20).default("Без таймкода").meta({ description: "Точный интервал только из длительности или сценария брифа; иначе «Без таймкода»." }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg",
        __image_prompt__:
          "Главное действие кульминации или финала в среде, с героями и объектами, заданными брифом",
      },
      {
        __image_url__: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg",
        __image_prompt__:
          "Эмоциональный результат, реакция, деталь или финальный образ, дополняющий главное действие и завершающий историю",
      },
    ])
    .meta({ description: "Ровно два разных кадра: главное действие кульминации и эмоциональный или смысловой финальный образ." }),

  // Цельные блоки текста слева (без разбиения на строки в разметке)
  framesText: z
    .string()
    .min(10)
    .max(420)
    .default("Кадры: главное действие достигает кульминации и переходит в ясный эмоциональный или смысловой финал.")
    .meta({ description: "Описание кульминационных и финальных кадров по концепции. Не придумывать церемонию, сцену, аудиторию или брендинг." }),

  graphicsTextBlock: z
    .string()
    .min(5)
    .max(220)
    .default("Графика: финальное сообщение или призыв завершает историю и поддерживает задачу ролика.")
    .meta({ description: "Финальный титр, сообщение или призыв из брифа либо нейтральное творческое предложение без вымышленных фактов." }),
});

type StoryboardClimaxData = z.infer<typeof Schema>;

interface StoryboardClimaxProps {
  data?: Partial<StoryboardClimaxData>;
}

const dynamicSlideLayout: React.FC<StoryboardClimaxProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Единый стиль — без display-серифов
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const barColor = resolveColor(slideData, "bars", "background", "#BFBFBF", "muted");

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
                  description: "Storyboard phase",
                })}
              >
                {slideData?.phase || "Кульминация"}
              </span>{" "}
              (<span
                {...promptTargetAttrs({
                  path: "timing",
                  type: "field",
                  name: "Timing",
                  description: "Storyboard timing range",
                })}
              >
                {slideData?.timing || "Без таймкода"}
              </span>)
            </div>

            <div className="mt-[86px] space-y-[44px]">
              <div
                {...promptTargetAttrs({
                  path: "framesText",
                  type: "field",
                  name: "Frames text",
                  description: "Frames block",
                })}
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.framesText ||
                  "Кадры: главное действие достигает кульминации и переходит в ясный эмоциональный или смысловой финал."}
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
                {slideData?.graphicsTextBlock || "Графика: финальное сообщение или призыв завершает историю и поддерживает задачу ролика."}
              </div>
            </div>

            <div className="mt-auto" />
          </div>

          {/* Правая колонка — 2 изображения рядом, без оверлеев */}
          <div className="flex h-full items-center">
            <div className="w-full grid grid-cols-2 gap-[22px]">
              <div className="w-full h-[420px] bg-black/5">
                {img1 ? (
                  <img
                    {...promptTargetAttrs({
                      path: `visuals[${0}].__image_prompt__`,
                      type: "image",
                      name: "Climax image 1",
                      description: "First climax visual prompt",
                    })}
                    src={img1}
                    alt={visuals[0]?.__image_prompt__ || "Climax image 1"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>

              <div className="w-full h-[420px] bg-black/5">
                {img2 ? (
                  <img
                    {...promptTargetAttrs({
                      path: `visuals[${1}].__image_prompt__`,
                      type: "image",
                      name: "Climax image 2",
                      description: "Second climax visual prompt",
                    })}
                    src={img2}
                    alt={visuals[1]?.__image_prompt__ || "Climax image 2"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
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
