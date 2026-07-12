import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const layoutId = "typography-spec-slide";
const layoutName = "Typography Spec Slide";
const layoutDescription =
  "Типографика оформления и её применение на релевантном носителе: навигации, меню, приглашении, постере или другом объекте из брифа.";

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL правого изображения." }),
  __image_prompt__: z
    .string()
    .min(10)
    .max(260)
    .meta({
      description:
        "Носитель типографики: вывеска, навигация, меню, приглашение или постер. Использовать только стиль, палитру, материалы и настроение из брифа.",
    }),
});

const Schema = z.object({
  rightImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/1227511/pexels-photo-1227511.jpeg",
    __image_prompt__:
      "Typography-focused event print or navigation object based on the brief: relevant carrier, palette, materials, lighting, and mood, realistic editorial photo, clean readable surface",
  }),
});

type TypographySpecData = z.infer<typeof Schema>;

interface TypographySpecProps {
  data?: Partial<TypographySpecData>;
}

const dynamicSlideLayout: React.FC<TypographySpecProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  // Ключевой фикс: НЕ display (иначе заголовок может стать серифным)
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const textColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const paperBg = resolveColor(slideData, "paper", "background", "#F3F1EE", "surface");
  const paperBorder = resolveColor(slideData, "paper", "borderColor", "#E2DED7", "surface");
  const ruleColor = resolveColor(slideData, "paper_rule", "background", "#CFCAC2", "surface");

  const rightImg =
    slideData?.rightImage?.__image_url__ ||
    "https://images.pexels.com/photos/1227511/pexels-photo-1227511.jpeg";

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="h-full px-[56px] pt-[44px] pb-[44px]">
        <div className="h-full grid grid-cols-[minmax(0,0.64fr)_minmax(0,0.36fr)] gap-[34px]">
          {/* LEFT */}
          <div className="min-w-0 flex flex-col">
            <div
              className="uppercase font-[900] text-[44px] leading-[52px]"
              style={{ color: titleColor, fontFamily: titleFont }}
            >
              ТИПОГРАФИКА
            </div>

            <div
              className="mt-[22px] flex-1 rounded-[10px] border overflow-hidden"
              style={{ backgroundColor: paperBg, borderColor: paperBorder }}
            >
              {/* Мягкая фактура бумаги (менее “шумная”) */}
              <div
                className="h-full w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, rgba(255,255,255,0.62), rgba(255,255,255,0.62)), radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
                  backgroundSize: "auto, 10px 10px",
                }}
              >
                <div className="h-full p-[28px] grid grid-cols-2 gap-[28px]">
                  {/* Inter Bold */}
                  <div className="relative pl-[18px]">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[4px] rounded-full"
                      style={{ backgroundColor: ruleColor }}
                    />
                    <div
                      className="text-[34px] leading-[40px]"
                      style={{ color: textColor, fontFamily: bodyFont, fontWeight: 800 }}
                    >
                      Inter Bold
                    </div>

                    <ul
                      className="mt-[14px] space-y-[10px] text-[20px] leading-[26px] list-disc pl-[22px]"
                      style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                    >
                      <li>Заголовки</li>
                      <li>Короткие акценты</li>
                      <li>Пункты перечней</li>
                    </ul>

                    <div className="mt-[22px]">
                      <div
                        className="text-[40px] leading-[44px]"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 800 }}
                      >
                        Aa Bb Cc
                      </div>
                      <div
                        className="mt-[6px] text-[32px] leading-[36px]"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                      >
                        123
                      </div>

                      <div
                        className="mt-[18px] text-[18px] leading-[24px] opacity-80"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                      >
                        AbCbZzAe
                        <br />
                        Aa Bb Cc&nbsp;&nbsp;123
                      </div>
                    </div>
                  </div>

                  {/* Inter Regular */}
                  <div className="relative pl-[18px]">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[4px] rounded-full"
                      style={{ backgroundColor: ruleColor }}
                    />
                    <div
                      className="text-[34px] leading-[40px]"
                      style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                    >
                      Inter Regular
                    </div>

                    <div
                      className="mt-[14px] text-[20px] leading-[26px] max-w-[270px]"
                      style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                    >
                      Основное повествование. Нейтральный текст, пригодный как для презентаций, так и
                      для лендингов.
                    </div>

                    <div className="mt-[22px]">
                      <div
                        className="text-[40px] leading-[44px]"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                      >
                        Aa Bb Cc
                      </div>
                      <div
                        className="mt-[6px] text-[32px] leading-[36px]"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                      >
                        123
                      </div>

                      <div
                        className="mt-[18px] text-[18px] leading-[24px] opacity-80"
                        style={{ color: textColor, fontFamily: bodyFont, fontWeight: 500 }}
                      >
                        AbCbZzAe
                        <br />
                        Aa Bb Cc&nbsp;&nbsp;123
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: “poster on stand” look */}
          <div className="min-w-0 flex items-start justify-end pt-[6px]">
            <div className="relative w-full max-w-[450px]">
              {/* белая рамка + тень */}
              <div className="relative w-full bg-white p-[10px] shadow-[0_18px_30px_rgba(0,0,0,0.18)]">
                <img
                  {...promptTargetAttrs({
                    path: "rightImage.__image_prompt__",
                    type: "image",
                    name: "Right image prompt",
                    description: "Изображение носителя типографики",
                  })}
                  src={rightImg}
                  alt={slideData?.rightImage?.__image_prompt__ || "Poster photo"}
                  className="block w-full h-auto aspect-[43/54] object-cover"
                />
                <div className="pointer-events-none absolute left-[10px] top-[10px] right-[10px] bottom-[10px] border border-white/70" />
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
