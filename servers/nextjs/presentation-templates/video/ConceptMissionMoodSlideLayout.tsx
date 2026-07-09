import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const layoutId = "concept-mission-mood-slide";
const layoutName = "Concept Mission Mood Slide";
const layoutDescription = "A concept slide with a hero quote card and two columns (mission + mood).";

/**
 * В эталоне (изобр.1):
 * 1) Большая бирюзовая плашка-цитата (концепция) сверху на всю ширину.
 * 2) Ниже 2 колонки: заголовок + тонкая линия + текст (без серых карточек).
 */
const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ ВИДЕО").meta({
    description: "Main section title. Max 3 words",
  }),

  // Верхняя широкая плашка (цитата/концепт)
  heroQuote: z
    .string()
    .min(40)
    .max(700)
    .default(
      "В основе — идея «точки сборки»: конкурс объединяет разрозненные таланты в единое профессиональное сообщество. Через живые интервью, динамичный монтаж и контраст цифровой эстетики с человеческими эмоциями ролик показывает, что за каждой строкой кода стоит человек — с амбициями, вызовами и стремлением к развитию."
    )
    .meta({ description: "Main concept quote in the teal card." }),

  missionTitle: z.string().min(2).max(30).default("Миссия").meta({
    description: "Mission block title. Max 2 words",
  }),
  missionContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Создать устойчивую среду для роста и признания IT-специалистов, объединить экспертов, разработчиков, студентов и компании в точке сборки профессионального сообщества."
    )
    .meta({ description: "Mission description." }),

  moodTitle: z.string().min(2).max(30).default("Настроение видео").meta({
    description: "Mood block title. Max 3 words",
  }),
  moodContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Технологичная динамика, цифровая эстетика, LED-экраны, световые инсталляции, строгая геометрия. Атмосфера интеллектуального вызова и профессионального драйва"
    )
    .meta({ description: "Mood description." }),
});

type ConceptMissionMoodData = z.infer<typeof Schema>;

interface ConceptMissionMoodProps {
  data?: Partial<ConceptMissionMoodData>;
}

const dynamicSlideLayout: React.FC<ConceptMissionMoodProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body");

  const titleColor = resolveColor(slideData, "title", "color", "#2F2F2F", "text_primary");
  const bodyColor = resolveColor(slideData, "body", "color", "#2F2F2F", "text_primary");

  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display");
  const sectionTitleFont = resolveFontFamily(slideData, "section_title", rootFont, "heading");
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");

  const heroBg = resolveColor(slideData, "hero_card", "background", "#5C9EA0", "accent");
  const heroText = resolveColor(slideData, "hero_card", "color", "#FFFFFF", "on_accent");
  const ruleColor = resolveColor(slideData, "rule", "background", "#2F2F2F", "text_primary");

  return (
    <div
      className="relative w-full max-w-[1280px] aspect-video mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      {/* Внутренние поля как в эталоне */}
      <div className="h-full px-[72px] pt-[48px] pb-[44px] flex flex-col">
        {/* Заголовок */}
        <div
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Main section title",
          })}
          className="uppercase font-[800] text-[48px] leading-[56px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "КОНЦЕПЦИЯ ВИДЕО"}
        </div>

        {/* Бирюзовая плашка-цитата */}
        <div
          className="mt-[26px] rounded-[18px] shadow-[0_10px_18px_rgba(0,0,0,0.18)] px-[28px] py-[26px] flex gap-[18px]"
          style={{ backgroundColor: heroBg }}
        >
          {/* Кавычки слева */}
          <div
            className="select-none font-[900] leading-none"
            style={{
              color: heroText,
              fontFamily: bodyFont,
              fontSize: 64,
              transform: "translateY(-4px)",
            }}
          >
            &laquo;
          </div>

          <div
            {...promptTargetAttrs({
              path: "heroQuote",
              type: "field",
              name: "Hero quote",
              description: "Main concept quote",
            })}
            className="font-[700] text-[24px] leading-[30px]"
            style={{ color: heroText, fontFamily: bodyFont }}
          >
            {slideData?.heroQuote ||
              "В основе — идея «точки сборки»: конкурс объединяет разрозненные таланты..."}
          </div>
        </div>

        {/* Две колонки снизу */}
        <div className="mt-[44px] grid grid-cols-2 gap-[84px] flex-1">
          {/* Левая колонка */}
          <section className="flex flex-col">
            <div
              {...promptTargetAttrs({
                path: "missionTitle",
                type: "field",
                name: "Mission title",
                description: "Mission column heading",
              })}
              className="font-[800] text-[28px] leading-[34px]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
            >
              {slideData?.missionTitle || "Миссия"}
            </div>

            {/* Линия под заголовком */}
            <div className="mt-[12px] h-[2px] w-full opacity-70" style={{ backgroundColor: ruleColor }} />

            <div
              {...promptTargetAttrs({
                path: "missionContent",
                type: "field",
                name: "Mission content",
                description: "Mission column body",
              })}
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.missionContent || "Создать устойчивую среду..."}
            </div>
          </section>

          {/* Правая колонка */}
          <section className="flex flex-col">
            <div
              {...promptTargetAttrs({
                path: "moodTitle",
                type: "field",
                name: "Mood title",
                description: "Mood column heading",
              })}
              className="font-[800] text-[28px] leading-[34px]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
            >
              {slideData?.moodTitle || "Настроение видео"}
            </div>

            {/* Линия под заголовком */}
            <div className="mt-[12px] h-[2px] w-full opacity-70" style={{ backgroundColor: ruleColor }} />

            <div
              {...promptTargetAttrs({
                path: "moodContent",
                type: "field",
                name: "Mood content",
                description: "Mood column body",
              })}
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.moodContent || "Технологичная динамика..."}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
