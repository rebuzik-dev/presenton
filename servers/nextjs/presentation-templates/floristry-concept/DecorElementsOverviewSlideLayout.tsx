import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z.string().min(10).max(320).meta({
    description:
      "Главная флористическая композиция по брифу: релевантная зона, масштаб, растения или альтернативные материалы, сосуды, палитра и свет. Не придумывать виды растений, людей, символы и логотипы.",
  }),
});

const layoutId = "decor-elements-slide";
const layoutName = "Decor Elements Slide";
const layoutDescription =
  "Основные элементы флористики: композиции, растения, сосуды, опоры, фактуры и способы размещения, основанные на брифе и сезонных ограничениях."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(60)
    .default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ФЛОРИСТИКИ")
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
      "Основные композиции выбираются из задач брифа: для каждой релевантной зоны определяется функция, масштаб, силуэт, плотность и способ размещения с учётом движения гостей и ограничений площадки."
    )
    .meta({
      description:
        "Основные флористические композиции из брифа: зоны, функция, масштаб, силуэт, ограничения площадки и обслуживания.",
    }),

  descriptionBottom: z
    .string()
    .min(10)
    .max(260)
    .default(
      "Дополнительные решения раскрываются через виды или группы растений, альтернативные материалы, сосуды, опоры, фактуры и малые акценты, если они обоснованы брифом и сезонностью."
    )
    .meta({
      description:
        "Дополнительные слои флористики: растения, альтернативные материалы, сосуды, опоры, фактуры и способы размещения из брифа.",
    }),

  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
    __image_prompt__:
      "Floristry composition in the relevant venue zone based on the brief, coherent palette, plant or alternative materials, vessels, scale, lighting and mood, high-end editorial event photo",
  }).meta({
    description:
      "Правое изображение флористической композиции по брифу, согласованное с палитрой, материалами, масштабом и настроением всей презентации.",
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
            description: "Заголовок элементов флористики",
          })}
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ФЛОРИСТИКИ"}
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
                description: "Описание основных флористических композиций",
              })}
              className="text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionTop ||
                "Основные композиции выбираются из задач брифа и ограничений площадки..."}
            </div>

            <div
              {...promptTargetAttrs({
                path: "descriptionBottom",
                type: "field",
                name: "Bottom description",
                description: "Описание растений, материалов, сосудов и деталей",
              })}
              className="mt-[26px] text-[20px] leading-[28px] font-[500]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.descriptionBottom ||
                "Дополнительные решения раскрываются через растения, материалы, сосуды и фактуры..."}
            </div>
          </div>

          {/* Right wide image */}
          <div className="w-full">
            <div className="w-full h-[460px] overflow-hidden">
              <img
                {...promptTargetAttrs({
                  path: "image.__image_prompt__",
                  type: "image",
                  name: "Floristry image prompt",
                  description: "Главная флористическая композиция",
                })}
                src={imgUrl}
                alt={slideData?.image?.__image_prompt__ || "Floristry composition"}
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
