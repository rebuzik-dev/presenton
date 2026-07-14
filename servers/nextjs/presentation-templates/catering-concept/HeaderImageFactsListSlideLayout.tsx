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
    .default("Общий вид кейтеринга в формате и пространстве мероприятия из брифа")
    .meta({ description: "Общий кадр сервиса или подачи. Не добавлять людей, зоны, брендинг и формат, которых нет в брифе." }),
});

const layoutId = "header-image-facts-list-slide";
const layoutName = "Header Image Facts List Slide";
const layoutDescription =
  "Общая информация о кейтеринге: подтверждённые параметры сервиса и ассортимент, без вымышленных количеств, норм, блюд или ограничений.";

// ✅ Заголовки не заполняются ИИ — поэтому title/listTitle убраны из Schema
const Schema = z.object({
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Общий вид кейтеринг-зоны или подачи, соответствующий формату, площадке и гостевому сценарию из брифа",
  }).meta({ description: "Главное изображение показывает общий формат кейтеринга и не дублирует крупный план блюда." }),

  // ✅ ЦЕЛЬНЫЙ блок под факты (ИИ заполняет одним текстом)
  factsText: z
    .string()
    .min(10)
    .max(420)
    .default(
      "Параметры сервиса определяются числом гостей, длительностью программы, форматом обслуживания и условиями площадки."
    )
    .meta({ description: "Фактические параметры из брифа: число гостей, нормы, длительность, зоны или тайминг. Не придумывать отсутствующие значения." }),

  // ✅ ЦЕЛЬНЫЙ блок под ассортимент (ИИ заполняет одним текстом)
  assortmentText: z
    .string()
    .min(10)
    .max(420)
    .default("Ассортимент формируется под аудиторию, время проведения, формат подачи и указанные пищевые ограничения.")
    .meta({ description: "Категории меню и их количество только из брифа; при отсутствии состава дать принцип формирования без вымышленных блюд." }),
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
          ОБЩАЯ ИНФОРМАЦИЯ
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
              alt={slideData?.image?.__image_prompt__ || "Общий вид кейтеринга"}
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
                  Параметры сервиса
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                  {...promptTargetAttrs({
                    path: "factsText",
                    type: "field",
                    name: "Факты",
                    description: "Подтверждённые параметры сервиса без вымышленных значений",
                    role: "facts_text",
                  })}
                >
                  {slideData?.factsText ||
                    "Параметры сервиса определяются числом гостей, длительностью программы, форматом обслуживания и условиями площадки."}
                </div>
              </div>

              <div>
                <div
                  className="text-[22px] leading-[28px] font-[800]"
                  style={{ color: titleColor, fontFamily: bodyFont }}
                >
                  Ассортимент
                </div>
                <div
                  className="mt-3 text-[20px] leading-[28px] font-[500]"
                  style={{ color: bodyColor, fontFamily: bodyFont }}
                  {...promptTargetAttrs({
                    path: "assortmentText",
                    type: "field",
                    name: "Ассортимент",
                    description: "Подтверждённый ассортимент или принцип его формирования",
                    role: "assortment_text",
                  })}
                >
                  {slideData?.assortmentText ||
                    "Ассортимент формируется под аудиторию, время проведения, формат подачи и указанные пищевые ограничения."}
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
