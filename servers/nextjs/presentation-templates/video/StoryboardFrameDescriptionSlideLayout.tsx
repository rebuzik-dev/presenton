import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(5).max(220).meta({ description: "Самостоятельный кадр вступления по брифу; два слота должны различаться планом и содержанием." }),
});

const layoutId = "storyboard-frame-description-slide";
const layoutName = "Storyboard Frame Description Slide";
const layoutDescription =
  "Начало раскадровки: хук, описание вступительных кадров, возможный текст озвучки и два разных плана одной сцены.";

const Schema = z.object({
  title: z
    .string()
    .min(3)
    .max(40)
    .default("РАСКАДРОВКА")
    .meta({ description: "Заголовок раздела с раскадровкой." }),

  phase: z
    .string()
    .min(2)
    .max(30)
    .default("Хук")
    .meta({ description: "Название вступительного драматургического этапа." }),

  timing: z
    .string()
    .min(5)
    .max(20)
    .default("Без таймкода")
    .meta({ description: "Точный интервал только при наличии длительности или тайминга в брифе; иначе написать «Без таймкода»." }),

  framesLabel: z
    .string()
    .min(2)
    .max(30)
    .default("Кадры:")
    .meta({ description: "Короткая подпись перед описанием визуального ряда." }),

  visualDescription: z
    .string()
    .min(10)
    .max(420)
    .default("Первый выразительный образ быстро вводит зрителя в тему, контекст и эмоциональный тон проекта.")
    .meta({ description: "Конкретное описание вступительных кадров по брифу. Творческий хук допустим, фактические детали не придумывать." }),

  voiceoverLabel: z
    .string()
    .min(2)
    .max(40)
    .default("Текст для озвучки:")
    .meta({ description: "Подпись перед текстом озвучки или экранным сообщением." }),

  voiceover: z
    .string()
    .min(10)
    .max(520)
    .default("Короткая фраза задаёт тему и обещание ролика, не повторяя неподтверждённые факты.")
    .meta({ description: "Текст озвучки или экранное сообщение в тональности проекта. Не приписывать бренду утверждения, которых нет в брифе." }),

  imageLeft: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Общий или установочный план вступительной сцены, раскрывающий контекст проекта из брифа",
  }).meta({ description: "Первый кадр: общий план, пространство или главный образ вступления." }),

  imageRight: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg",
    __image_prompt__: "Деталь, действие или эмоциональная реакция в той же вступительной сцене, отличимая от общего плана",
  }).meta({ description: "Второй кадр: деталь или действие той же сцены, не дублирующее первый кадр." }),
});

type StoryboardFrameData = z.infer<typeof Schema>;

interface StoryboardFrameProps {
  data?: Partial<StoryboardFrameData>;
}

const dynamicSlideLayout: React.FC<StoryboardFrameProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Важно: чтобы не уезжать в "серифный" display, как на проблемном превью
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const barColor = resolveColor(slideData, "bars", "background", "#BFBFBF", "muted");
  const dividerColor = resolveColor(slideData, "divider", "background", "#1F1F1F", "text_primary");

  const leftImg = slideData?.imageLeft?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";
  const rightImg = slideData?.imageRight?.__image_url__ || "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg";

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      {/* Серые полосы сверху/снизу как в эталоне */}
      <div className="absolute left-0 top-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />
      <div className="absolute left-0 bottom-0 w-full h-[18px]" style={{ backgroundColor: barColor }} />

      {/* Контент */}
      <div className="relative h-full px-[48px] pt-[40px] pb-[40px]">
        <div className="h-full grid grid-cols-[0.38fr_0.62fr] gap-[44px]">
          {/* Левая текстовая колонка */}
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

            <div className="mt-[18px]">
              <div
                className="font-[800] text-[22px] leading-[28px]"
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
                  {slideData?.phase || "Хук"}
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
            </div>

            <div className="mt-[56px] space-y-[34px]">
              <div>
                <div
                  className="font-[500] text-[22px] leading-[28px]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                >
                  <span
                    {...promptTargetAttrs({
                      path: "framesLabel",
                      type: "field",
                      name: "Frames label",
                      description: "Label for visuals description",
                    })}
                  >
                    {slideData?.framesLabel || "Кадры:"}
                  </span>{" "}
                  <span
                    {...promptTargetAttrs({
                      path: "visualDescription",
                      type: "field",
                      name: "Visual description",
                      description: "Description of the frame",
                    })}
                  >
                    {slideData?.visualDescription ||
                      "Первый выразительный образ быстро вводит зрителя в тему, контекст и эмоциональный тон проекта."}
                  </span>
                </div>
              </div>

              <div>
                <div
                  className="font-[500] text-[22px] leading-[28px]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                >
                  <span
                    {...promptTargetAttrs({
                      path: "voiceoverLabel",
                      type: "field",
                      name: "Voiceover label",
                      description: "Label for voiceover block",
                    })}
                  >
                    {slideData?.voiceoverLabel || "Текст для озвучки:"}
                  </span>{" "}
                  <span
                    {...promptTargetAttrs({
                      path: "voiceover",
                      type: "field",
                      name: "Voiceover",
                      description: "Narrator text",
                    })}
                  >
                    {slideData?.voiceover ||
                      "Короткая фраза задаёт тему и обещание ролика, не повторяя неподтверждённые факты."}
                  </span>
                </div>
              </div>
            </div>

            {/* тонкий “воздух” снизу */}
            <div className="mt-auto" />
          </div>

          {/* Правая колонка: 2 изображения рядом */}
          <div className="flex h-full items-center">
            <div className="w-full grid grid-cols-2 gap-[34px]">
              <div className="w-full h-[520px]">
                <img
                  {...promptTargetAttrs({
                    path: "imageLeft.__image_prompt__",
                    type: "image",
                    name: "Left image prompt",
                    description: "Left storyboard image prompt",
                  })}
                  src={leftImg}
                  alt={slideData?.imageLeft?.__image_prompt__ || "Storyboard image left"}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="w-full h-[520px]">
                <img
                  {...promptTargetAttrs({
                    path: "imageRight.__image_prompt__",
                    type: "image",
                    name: "Right image prompt",
                    description: "Right storyboard image prompt",
                  })}
                  src={rightImg}
                  alt={slideData?.imageRight?.__image_prompt__ || "Storyboard image right"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* (опционально) вертикальный разделитель — в эталоне его нет, но если нужен, раскомментируй */}
            {/* <div className="ml-[28px] w-[2px] h-[520px] opacity-20" style={{ backgroundColor: dividerColor }} /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
