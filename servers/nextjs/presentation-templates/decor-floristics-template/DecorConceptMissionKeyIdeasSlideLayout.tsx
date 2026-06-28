import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";

const layoutId = "concept-mission-mood-slide";
const layoutName = "Concept Mission Mood Slide";
const layoutDescription =
  "A brief-driven concept slide with a central decor idea plus mission and mood blocks. Use only theme, mood, format, audience, venue, and visual references supported by the brief.";

/**
 * В эталоне (изобр.1):
 * 1) Большая цветовая плашка-цитата (концепция) сверху на всю ширину.
 * 2) Ниже 2 колонки: заголовок + тонкая линия + текст (без серых карточек).
 */
const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ ДЕКОРАЦИОННОГО ОФОРМЛЕНИЯ").meta({
    description:
      "Universal section title about the decor concept. Keep it broad and do not include a specific occasion, flower, symbol, or venue unless the brief requires it.",
  }),

  // Верхняя широкая плашка (цитата/концепт)
  heroQuote: z
    .string()
    .min(40)
    .max(700)
    .default(
      "Визуальная идея оформления формируется из брифа: тема события, формат, площадка, настроение, аудитория, сезонность, палитра, материалы и флористика соединяются в единый образ. Не добавляйте символы, даты, цветы, людей, логотипы или предметные решения, если они не указаны или явно не следуют из брифа."
    )
    .meta({
      description:
        "Central decor idea inferred from the brief. Summarize the event-specific visual logic and explicitly avoid unsupported dates, symbols, flowers, people, logos, industries, or fixed decor elements.",
    }),

  missionTitle: z.string().min(2).max(30).default("Миссия").meta({
    description: "Mission block title. Max 2 words",
  }),
  missionContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Сформировать цельное пространство для события: поддержать сценарий, настроение и статус мероприятия, сделать ключевые зоны выразительными и согласовать декор с площадкой, аудиторией и задачами брифа."
    )
    .meta({
      description:
        "Describe the visual styling task for this event based on the brief: function, atmosphere, audience, format, venue, and desired impression. Do not invent a holiday, industry, or ceremonial meaning.",
    }),

  moodTitle: z.string().min(2).max(30).default("Ключевые смыслы").meta({
    description: "Mood block title. Max 3 words",
  }),
  moodContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Ключевые смыслы раскрываются через настроение, визуальные опоры, палитру, фактуры, свет, флористику и композиционные приемы, которые заданы брифом или логично следуют из него."
    )
    .meta({
      description:
        "List the mood, meanings, style references, palette, materials, floristics, lighting, and spatial cues from the brief. Do not add unsupported symbolic or seasonal references.",
    }),
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
          className="uppercase font-[800] text-[48px] leading-[56px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "КОНЦЕПЦИЯ ДЕКОРАЦИОННОГО ОФОРМЛЕНИЯ"}
        </div>

        {/* Цветовая плашка-цитата */}
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
            className="font-[700] text-[24px] leading-[30px]"
            style={{ color: heroText, fontFamily: bodyFont }}
          >
            {slideData?.heroQuote ||
              "Визуальная идея оформления формируется из темы, формата, площадки и настроения события..."}
          </div>
        </div>

        {/* Две колонки снизу */}
        <div className="mt-[44px] grid grid-cols-2 gap-[84px] flex-1">
          {/* Левая колонка */}
          <section className="flex flex-col">
            <div
              className="font-[800] text-[28px] leading-[34px]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
            >
              {slideData?.missionTitle || "Миссия"}
            </div>

            {/* Линия под заголовком */}
            <div className="mt-[12px] h-[2px] w-full opacity-70" style={{ backgroundColor: ruleColor }} />

            <div
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.missionContent || "Сформировать цельное пространство для события..."}
            </div>
          </section>

          {/* Правая колонка */}
          <section className="flex flex-col">
            <div
              className="font-[800] text-[28px] leading-[34px]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
            >
              {slideData?.moodTitle || "Ключевые смыслы"}
            </div>

            {/* Линия под заголовком */}
            <div className="mt-[12px] h-[2px] w-full opacity-70" style={{ backgroundColor: ruleColor }} />

            <div
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.moodContent || "Ключевые смыслы раскрываются через настроение, палитру, фактуры и свет..."}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
