import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Image URL" }),
  __image_prompt__: z.string().min(10).max(320).meta({
    description:
      "Широкий референс декора по брифу: главный акцент, палитра, материалы, флористика, свет, площадка и настроение только при наличии оснований.",
  }),
});

const layoutId = "storyboard-split-visual-slide";
const layoutName = "Decor Elements Wide Image Slide";
const layoutDescription =
  "Главный визуальный акцент оформления: широкое изображение и два блока о палитре, материалах, атмосфере и смысле по брифу."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА")
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
      "Главный визуальный акцент определяется брифом: это может быть пространственная форма, флористическая масса, световой прием, материал, объект, зона или композиция, которая собирает образ события."
    )
    .meta({
      description:
        "Главный визуальный акцент из брифа и его работа в пространстве. Не придумывать конструкцию, цветок, объект или световой эффект.",
    }),

  textBottom: z
    .string()
    .min(20)
    .max(520)
    .default(
      "Палитра, материалы, флористика и атмосфера должны продолжать исходный бриф: описывайте только те фактуры, оттенки, сезонность и смыслы, которые заданы или логично выведены."
    )
    .meta({
      description:
        "Палитра, материалы, флористика, атмосфера и смысл из брифа в согласовании с предыдущими слайдами.",
    }),

  // В референсе одно большое изображение слева
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Wide editorial event decor reference based on the brief: main visual accent, coherent palette, materials, floristics, lighting, venue context, atmosphere, high-end composition",
  }).meta({
    description:
      "Широкое изображение декора, согласованное с брифом, палитрой и материалами. Не навязывать цветок, объект, конструкцию или людей.",
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
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДЕКОРА"}
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
                  name: "Decor accent image prompt",
                  description: "Широкий референс декора",
                })}
                src={imgUrl}
                alt={slideData?.image?.__image_prompt__ || "Decor floristics"}
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
                "Палитра, материалы, флористика и атмосфера продолжают исходный бриф."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
