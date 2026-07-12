import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(5).max(220).meta({ description: "Один кадр ключевого момента истории; второй слот должен показывать другой план или реакцию." }),
});

const layoutId = "storyboard-event-point-slide";
const layoutName = "Storyboard Event Point Slide";
const layoutDescription =
  "Ключевой момент видеосюжета: поворот, встреча, демонстрация или другое событие из концепции с двумя разными кадрами и опциональной датой или метрикой."

const Schema = z.object({
  title: z.string().min(3).max(40).default("РАСКАДРОВКА").meta({ description: "Заголовок раздела с раскадровкой." }),

  phase: z
    .string()
    .min(2)
    .max(60)
    .default("Ключевой момент")
    .meta({ description: "Название поворотного или центрального этапа конкретной истории." }),

  timing: z
    .string()
    .min(5)
    .max(20)
    .default("Без таймкода")
    .meta({ description: "Точный интервал только из длительности или сценария брифа; иначе «Без таймкода»." }),

  // Цельный блок текста (без ручного разбиения на строки в разметке)
  framesText: z
    .string()
    .min(10)
    .max(420)
    .default("Кадры: центральное действие или поворот раскрывает главное сообщение и меняет эмоциональный ритм ролика.")
    .meta({ description: "Описание ключевого действия, героев и среды только в контексте брифа; творческий способ съёмки можно предложить." }),

  // Цельный блок графики (может включать дату и метрику в одном поле, если нужно)
  graphicsTextBlock: z
    .string()
    .min(5)
    .max(220)
    .default("Графика: ключевое сообщение или подтверждённый факт усиливает центральный момент.")
    .meta({ description: "Экранная графика. Даты, числа, названия и метрики использовать только при наличии в брифе." }),

  // Для бейджа на фото — отдельное поле
  badgeText: z
    .string()
    .min(3)
    .max(40)
    .default("Ключевой момент")
    .meta({ description: "Короткий акцент на изображении; метрику использовать только из брифа." }),

  dateText: z
    .string()
    .max(40)
    .default("")
    .meta({ description: "Опциональная дата точно из брифа. Если даты нет, вернуть пустую строку." }),

  visuals: z
    .array(ImageSchema)
    .min(2)
    .max(2)
    .default([
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Общий план ключевого действия, героя, объекта или пространства, заданного концепцией и брифом",
      },
      {
        __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
        __image_prompt__: "Деталь, альтернативный ракурс или эмоциональная реакция в том же ключевом моменте",
      },
    ])
    .meta({ description: "Ровно два связанных, но отличающихся кадра: общий план ключевого действия и дополняющая деталь или реакция." }),
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
                  description: "Название ключевого драматургического этапа",
                })}
              >
                {slideData?.phase || "Ключевой момент"}
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
                {slideData?.framesText || "Кадры: центральное действие или поворот раскрывает главное сообщение и меняет эмоциональный ритм ролика."}
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
                {slideData?.graphicsTextBlock || "Графика: ключевое сообщение или подтверждённый факт усиливает центральный момент."}
              </div>

              {/* Если хочешь держать дату отдельно — это отдельный блок, тоже цельный */}
              {/* <div
                className="font-[500] text-[22px] leading-[28px]"
                style={{ color: bodyColor, fontFamily: bodyFont }}
              >
                {slideData?.dateText || ""}
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
                      description: "ТЗ главного плана ключевого эпизода",
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
                      description: "ТЗ отдельного детального или эмоционального плана",
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
                    description: "Короткая подпись ключевого этапа",
                  })}
                  className="absolute bottom-[18px] left-1/2 -translate-x-1/2 px-[28px] py-[12px] rounded-[12px] font-[800] text-[26px] leading-[30px]"
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeTextColor,
                    fontFamily: bodyFont,
                    opacity: 0.9,
                  }}
                >
                  {slideData?.badgeText || "Ключевой момент"}
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
