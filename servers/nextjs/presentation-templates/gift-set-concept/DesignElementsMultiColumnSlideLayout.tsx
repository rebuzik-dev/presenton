import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const ImageSchema = z.object({
  __image_url__: z.string().url().default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"),
  __image_prompt__: z.string().min(3).max(180).default("Отдельный визуальный элемент подарочного набора").meta({
    description: "Самостоятельный кадр компонента, материала, графики или упаковки; не повторять соседние слоты и не добавлять случайный текст.",
  }),
});

const layoutId = "design-elements-multi-column-slide";
const layoutName = "Design Elements Multi Column Slide";
const layoutDescription =
  "Система подарочного набора: три разных кадра компонентов, материалов и упаковки плюс два кратких блока о связи элементов и опыте распаковки.";

const Schema = z.object({
  title: z.string().min(3).max(60).default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА").meta({
    description: "Заголовок раздела о визуальной системе подарочного набора.",
  }),

  // ✅ 3 изображения слева
  imageTopLeft: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Крупный план материала, фактуры, печати или отделки компонента подарочного набора",
  }),

  imageTopRight: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Отдельный графический мотив, паттерн или элемент айдентики, применимый к компонентам и упаковке набора",
  }),

  imageBottom: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Общий вид согласованного подарочного набора в контексте упаковки и комплектации",
  }),

  // ✅ текст справа оставляем как сейчас (2 блока)
  topText: z
    .string()
    .min(20)
    .max(260)
    .default("Форма, материал и отделка компонентов выбираются с учётом получателя, назначения, совместимости и производственных ограничений из брифа.")
    .meta({ description: "Первый блок: форма, материалы, технология и тактильные свойства. Фактические ограничения не придумывать." }),

  bottomText: z
    .string()
    .min(20)
    .max(260)
    .default("Графика и брендинг объединяют позиции в одну линейку и масштабируются на разные носители без потери узнаваемости.")
    .meta({ description: "Второй блок: графика, брендинг, паттерн и согласованность коллекции. Логотипы использовать только из брифа." }),
});

type Data = z.infer<typeof Schema>;

interface Props {
  data?: Partial<Data>;
}

const dynamicSlideLayout: React.FC<Props> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // ⚠️ чтобы не уезжать в серифный display
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const paperBg = resolveColor(slideData, "paper", "background", "#ffffffff", "surface");
  const paperBorder = resolveColor(slideData, "paper", "borderColor", "#E2DED7", "surface");

  const imgTL = slideData?.imageTopLeft?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";
  const imgTR = slideData?.imageTopRight?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";
  const imgB = slideData?.imageBottom?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg";

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, paperBg, "var(--template-font, Inter)")}
    >
      {/* мягкая бумажная фактура (можно убрать, если не нужна) */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(0deg, rgba(255,255,255,0.55), rgba(255,255,255,0.55)), radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "auto, 10px 10px",
        }}
      />

      <div className="relative h-full px-[64px] pt-[44px] pb-[44px]">
        <div
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Заголовок раздела о материалах и отделке",
          })}
          className="uppercase font-[900] text-[44px] leading-[52px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА"}
        </div>

        <div className="mt-[26px] grid grid-cols-[0.72fr_0.28fr] gap-[34px] h-[520px]">
          {/* LEFT: 3 images collage inside a rectangular block */}
          <div
            className="h-full border overflow-hidden bg-white/40"
            style={{ borderColor: paperBorder }}
          >
            <div className="h-full grid grid-rows-[0.42fr_0.58fr] gap-[18px] p-[18px]">
              {/* top row: small left + big right */}
              <div className="grid grid-cols-[0.36fr_0.64fr] gap-[18px] min-h-0">
                <div className="w-full h-full overflow-hidden bg-black/5" style={{ borderColor: paperBorder }}>
                  <img
                    {...promptTargetAttrs({
                      path: "imageTopLeft.__image_prompt__",
                      type: "image",
                      name: "Top left image prompt",
                      description: "ТЗ верхнего левого кадра с отдельным материалом или деталью",
                    })}
                    src={imgTL}
                    alt={slideData?.imageTopLeft?.__image_prompt__ || "Top left"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-full h-full overflow-hidden bg-black/5">
                  <img
                    {...promptTargetAttrs({
                      path: "imageTopRight.__image_prompt__",
                      type: "image",
                      name: "Top right image prompt",
                      description: "ТЗ верхнего правого кадра с другим материалом или отделкой",
                    })}
                    src={imgTR}
                    alt={slideData?.imageTopRight?.__image_prompt__ || "Top right"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* bottom row: one wide image */}
              <div className="w-full h-full overflow-hidden bg-black/5 min-h-0">
                <img
                  {...promptTargetAttrs({
                    path: "imageBottom.__image_prompt__",
                    type: "image",
                    name: "Bottom image prompt",
                    description: "ТЗ нижнего кадра со сценарием применения",
                  })}
                  src={imgB}
                  alt={slideData?.imageBottom?.__image_prompt__ || "Bottom"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: keep text blocks similar to current */}
          <div className="flex flex-col justify-start gap-7 pt-1">
            <div
              {...promptTargetAttrs({
                path: "topText",
                type: "field",
                name: "Top text",
                description: "Описание материалов и технологии",
              })}
              className="text-[16px] leading-[22px] text-[var(--style-text-primary)]/70"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.topText ||
                "Форма, материал и отделка компонентов выбираются с учётом получателя, назначения и производственных ограничений из брифа."}
            </div>

            <div
              {...promptTargetAttrs({
                path: "bottomText",
                type: "field",
                name: "Bottom text",
                description: "Описание отделки и применения",
              })}
              className="text-[16px] leading-[22px] text-[var(--style-text-primary)]/70"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.bottomText ||
                "Графика и брендинг объединяют позиции в одну линейку и масштабируются на разные носители без потери узнаваемости."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
