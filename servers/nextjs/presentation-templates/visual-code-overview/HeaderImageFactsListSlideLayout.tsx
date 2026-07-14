import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z
    .string()
    .url()
    .default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg")
    .meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Общий вид визуальной системы в пространстве мероприятия из брифа")
    .meta({ description: "Общий кадр пространства и визуальных носителей. Не добавлять зоны, брендинг и формат, которых нет в брифе." }),
});

const layoutId = "header-image-facts-list-slide";
const layoutName = "Header Image Facts List Slide";
const layoutDescription =
  "Архитектура визуального кода: подтверждённые носители, материалы и точки контакта без вымышленных зон, конструкций или требований.";

// ✅ Заголовки не заполняются ИИ — поэтому title/listTitle убраны из Schema
const Schema = z.object({
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Общий вид пространства и визуальных носителей, соответствующий формату, площадке и гостевому сценарию из брифа",
  }).meta({ description: "Главное изображение показывает применение визуального кода в пространстве." }),

  // ✅ ЦЕЛЬНЫЙ блок под факты (ИИ заполняет одним текстом)
  factsText: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Набор носителей и элементов определяется форматом события, гостевым путём, площадкой и задачами коммуникации."
    )
    .meta({ description: "Фактические параметры из брифа: формат, аудитория, площадка, зоны и точки контакта. Не придумывать отсутствующие значения." }),

  // ✅ ЦЕЛЬНЫЙ блок под систему элементов (ИИ заполняет одним текстом)
  assortmentText: z
    .string()
    .min(10)
    .max(420)
    .default("Палитра, типографика, материалы и графические приёмы формируют согласованную систему для разных носителей.")
    .meta({ description: "Состав визуальной системы: палитра, типографика, материалы, графика и носители. Конкретику брать из брифа либо обозначать как предложение." }),
});

type HeaderImageFactsListSlideData = z.infer<typeof Schema>;

interface Props {
  data?: Partial<HeaderImageFactsListSlideData>;
}

const dynamicSlideLayout: React.FC<Props> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // 🔧 Чтобы не уходить в “серифный display”
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary");
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface");

  return (
    <div
      className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white z-20 mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="h-full px-[72px] pt-12 pb-12">
        {/* ✅ Статичный заголовок — не из данных */}
        <div
          className="text-[52px] leading-[58px] font-[900] uppercase tracking-[0.2px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          АРХИТЕКТУРА ВИЗУАЛЬНОГО КОДА
        </div>

        <div className="mt-8 grid grid-cols-[1.45fr_0.85fr] gap-10 items-start">
          {/* Image */}
          <div
            className="w-full h-[472px] overflow-hidden"
            style={{ backgroundColor: surfaceColor }}
            {...promptTargetAttrs({
              path: "image.__image_prompt__",
              type: "image",
              name: "Основное изображение",
              description: "Фото слева от информационных блоков",
              role: "main_image",
            })}
          >
            <img
              src={
                slideData?.image?.__image_url__ ||
                "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
              }
              alt={slideData?.image?.__image_prompt__ || "Общий вид визуальной системы"}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right text blocks */}
          <div className="pt-1 max-h-[472px] overflow-hidden">
            {/* ✅ Заголовки секций статичные */}
            <div className="space-y-8">
              <div>
                <div
                  className="text-[22px] leading-[28px] font-[800]"
                  style={{ color: titleColor, fontFamily: bodyFont }}
                >
                  Контекст применения
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                  {...promptTargetAttrs({
                    path: "factsText",
                    type: "field",
                    name: "Факты",
                    description: "Подтверждённые параметры применения визуального кода",
                    role: "facts_text",
                  })}
                >
                  {slideData?.factsText ||
                    "Набор носителей и элементов определяется форматом события, гостевым путём, площадкой и задачами коммуникации."}
                </div>
              </div>

              <div>
                <div
                  className="text-[22px] leading-[28px] font-[800]"
                  style={{ color: titleColor, fontFamily: bodyFont }}
                >
                  Система элементов
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                  {...promptTargetAttrs({
                    path: "assortmentText",
                    type: "field",
                    name: "Система элементов",
                    description: "Состав визуальной системы и принцип её масштабирования",
                    role: "assortment_text",
                  })}
                >
                  {slideData?.assortmentText ||
                    "Палитра, типографика, материалы и графические приёмы формируют согласованную систему для разных носителей."}
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
