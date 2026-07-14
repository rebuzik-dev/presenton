import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(320).meta({
    description:
      "Главная сцена декора по брифу: тип события, площадка, палитра, материалы, флористика, свет и настроение. Не придумывать объекты, людей, символы и логотипы.",
  }),
});

const layoutId = "decor-elements-slide";
const layoutName = "Decor Elements Slide";
const layoutDescription =
  "Основные элементы декора: пространственные, материальные, флористические и световые решения, подтверждённые брифом."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА")
    .meta({
      description:
        "Универсальный заголовок раздела. Не упоминать конкретный повод, цветок, палитру или конструкцию без основания в брифе.",
    }),

  // 2 цельных текстовых блока (не бьём разметкой)
  descriptionTop: z
    .string()
    .min(20)
    .max(420)
    .default(
      "Основные пространственные элементы выбираются из задач брифа: зона встречи, сцена, фотозона, проходы, столы, навигация или другие ключевые точки оформляются в единой стилистике события."
    )
    .meta({
      description:
        "Основные архитектурные и пространственные элементы из брифа: формы, зоны, масштаб, ограничения площадки и функция.",
    }),

  descriptionBottom: z
    .string()
    .min(10)
    .max(260)
    .default(
      "Дополнительные решения раскрываются через материалы, фактуры, флористику, свет, текстиль, мебель и малые детали, которые поддерживают настроение и формат мероприятия."
    )
    .meta({
      description:
        "Дополнительные слои декора: материалы, флористика, свет, текстиль, мебель, реквизит и полиграфия из брифа.",
    }),

  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Main event decor scene based on the brief: relevant venue zone, coherent palette, materials, floristics, lighting, scale, and mood, high-end editorial interior/event photo",
  }).meta({
    description:
      "Правое изображение декора по брифу, согласованное с палитрой, материалами, флористикой и настроением всей презентации.",
  }),
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
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Заголовок элементов декора",
          })}
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
              {...promptTargetAttrs({
                path: "descriptionTop",
                type: "field",
                name: "Top description",
                description: "Описание основных пространственных элементов",
              })}
              className="text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionTop ||
                "Основные пространственные элементы выбираются из задач брифа..."}
            </div>

            <div
              {...promptTargetAttrs({
                path: "descriptionBottom",
                type: "field",
                name: "Bottom description",
                description: "Описание материалов, флористики и деталей",
              })}
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionBottom ||
                "Дополнительные решения раскрываются через материалы, фактуры, флористику и свет..."}
            </div>
          </div>

          {/* Right wide image */}
          <div className="w-full">
            <div className="w-full h-[460px] overflow-hidden">
              <img
                {...promptTargetAttrs({
                  path: "image.__image_prompt__",
                  type: "image",
                  name: "Decor image prompt",
                  description: "Главная сцена декора",
                })}
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
