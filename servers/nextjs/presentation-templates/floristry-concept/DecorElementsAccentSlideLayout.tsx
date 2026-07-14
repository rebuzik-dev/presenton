import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(320).meta({
    description:
      "Широкий референс главного флористического акцента по брифу: композиция, растения или альтернативные материалы, сосуды, палитра, масштаб, свет и площадка только при наличии оснований.",
  }),
});

const layoutId = "storyboard-split-visual-slide";
const layoutName = "Decor Elements Wide Image Slide";
const layoutDescription =
  "Главный флористический акцент: широкое изображение композиции и два блока о растениях, материалах, атмосфере и роли решения по брифу."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ФЛОРИСТИЧЕСКИЙ АКЦЕНТ")
    .meta({
      description:
        "Универсальный заголовок раздела о главном визуальном акценте без неподтверждённой событийной конкретики.",
    }),

  // 2 цельных текстовых блока (как в рефе)
  textTop: z
    .string()
    .min(20)
    .max(520)
    .default(
      "Главный флористический акцент определяется брифом: это может быть композиционная масса, ритм повторяющихся элементов, выразительный силуэт или группа композиций, которая собирает образ события."
    )
    .meta({
      description:
        "Главный флористический акцент из брифа и его работа в пространстве. Не придумывать конкретные растения, конструкцию или световой эффект.",
    }),

  textBottom: z
    .string()
    .min(20)
    .max(520)
    .default(
      "Палитра, растения или альтернативные материалы, сосуды и атмосфера должны продолжать исходный бриф: описывайте только те фактуры, оттенки, сезонность и смыслы, которые заданы или обоснованно предложены."
    )
    .meta({
      description:
        "Палитра, растения или альтернативные материалы, сосуды, атмосфера и смысл из брифа в согласовании с предыдущими слайдами.",
    }),

  // В референсе одно большое изображение слева
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Wide editorial floristry composition based on the brief: main floral accent, coherent palette, plant or alternative materials, vessels, scale, lighting, venue context and atmosphere",
  }).meta({
    description:
      "Широкое изображение флористического акцента, согласованное с брифом, палитрой и материалами. Не навязывать конкретное растение, конструкцию или людей.",
  }),
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
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Заголовок главного визуального акцента",
          })}
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ФЛОРИСТИЧЕСКИЙ АКЦЕНТ"}
        </div>

        {/* Content */}
        <div className="mt-[34px] grid grid-cols-[0.68fr_0.32fr] gap-[34px] items-start">
          {/* Left: large wide image */}
          <div className="w-full">
            <div className="w-full h-[470px] overflow-hidden bg-black/5">
              <img
                {...promptTargetAttrs({
                  path: "image.__image_prompt__",
                  type: "image",
                  name: "Floristry accent image prompt",
                  description: "Широкий референс флористического акцента",
                })}
                src={imgUrl}
                alt={slideData?.image?.__image_prompt__ || "Floristry accent"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: text (2 paragraphs) */}
          <div className="pt-[10px]">
            <div
              {...promptTargetAttrs({
                path: "textTop",
                type: "field",
                name: "Top text",
                description: "Описание главного визуального акцента",
              })}
              className="text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.textTop ||
                "Главный визуальный акцент определяется брифом и собирает образ события."}
            </div>

            <div
              {...promptTargetAttrs({
                path: "textBottom",
                type: "field",
                name: "Bottom text",
                description: "Описание палитры, материалов и атмосферы",
              })}
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.textBottom ||
                "Палитра, растения, материалы и атмосфера продолжают исходный бриф."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
