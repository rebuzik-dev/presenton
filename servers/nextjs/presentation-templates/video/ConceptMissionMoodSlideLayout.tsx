import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const layoutId = "concept-mission-mood-slide";
const layoutName = "Concept Mission Mood Slide";
const layoutDescription =
  "Концепция видеоролика: основная идея, коммуникационная задача и тональность, выведенные из целей, аудитории и контекста брифа.";

/**
 * В эталоне (изобр.1):
 * 1) Большая бирюзовая плашка-цитата (концепция) сверху на всю ширину.
 * 2) Ниже 2 колонки: заголовок + тонкая линия + текст (без серых карточек).
 */
const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ ВИДЕО").meta({
    description: "Заголовок раздела о концепции видео.",
  }),

  // Верхняя широкая плашка (цитата/концепт)
  heroQuote: z
    .string()
    .min(40)
    .max(700)
    .default(
      "Видеоролик раскрывает главную идею проекта через понятную драматургию, выразительные образы и эмоциональный путь, соответствующий задаче и аудитории из брифа."
    )
    .meta({ description: "Одна ёмкая формулировка творческой идеи. Не придумывать отрасль, героев, событие или визуальный приём без основания в брифе." }),

  missionTitle: z.string().min(2).max(30).default("Миссия").meta({
    description: "Заголовок блока с коммуникационной задачей ролика.",
  }),
  missionContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Донести ключевое сообщение до целевой аудитории и вызвать требуемое действие или впечатление, сохраняя точность фактов и интонацию проекта."
    )
    .meta({ description: "Коммуникационная задача и ожидаемый эффект ролика только из целей брифа." }),

  moodTitle: z.string().min(2).max(30).default("Настроение видео").meta({
    description: "Заголовок блока с настроением и визуальной тональностью.",
  }),
  moodContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Темп, свет, цвет, камера, звук и монтаж формируют настроение, которое соответствует формату, аудитории и эмоциональной задаче проекта."
    )
    .meta({ description: "Тональность и визуально-звуковые ориентиры из брифа либо обоснованные творческие предложения." }),
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
            description: "Заголовок раздела с концепцией",
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
              description: "Главная формулировка концепции",
            })}
            className="font-[700] text-[24px] leading-[30px]"
            style={{ color: heroText, fontFamily: bodyFont }}
          >
            {slideData?.heroQuote ||
              "Видеоролик раскрывает главную идею проекта через понятную драматургию, выразительные образы и эмоциональный путь."}
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
                description: "Заголовок колонки с задачей ролика",
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
                description: "Описание задачи ролика",
              })}
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.missionContent || "Донести ключевое сообщение до целевой аудитории и вызвать требуемое впечатление или действие."}
            </div>
          </section>

          {/* Правая колонка */}
          <section className="flex flex-col">
            <div
              {...promptTargetAttrs({
                path: "moodTitle",
                type: "field",
                name: "Mood title",
                description: "Заголовок колонки с тональностью",
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
                description: "Описание тональности ролика",
              })}
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.moodContent || "Темп, свет, цвет, камера, звук и монтаж формируют настроение, соответствующее задаче проекта."}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export { Schema, layoutId, layoutName, layoutDescription };
export default dynamicSlideLayout;
