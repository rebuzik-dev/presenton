import React from "react";
import * as z from "zod";
import { resolveColor, resolveFontFamily, resolveRootStyle } from "../_shared/style";
import { promptTargetAttrs } from "@/app/(presentation-generator)/components/PromptTarget";

const layoutId = "concept-mission-mood-slide";
const layoutName = "Concept Mission Mood Slide";
const layoutDescription =
  "Концепция флористического направления: центральная идея, роль живых и альтернативных материалов, задача и ключевые смыслы на основе брифа.";

/**
 * В эталоне (изобр.1):
 * 1) Большая цветовая плашка-цитата (концепция) сверху на всю ширину.
 * 2) Ниже 2 колонки: заголовок + тонкая линия + текст (без серых карточек).
 */
const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ ФЛОРИСТИЧЕСКОГО НАПРАВЛЕНИЯ").meta({
    description:
      "Универсальный заголовок концепции. Не добавлять конкретный повод, цветок, символ или площадку, если этого нет в брифе.",
  }),

  // Верхняя широкая плашка (цитата/концепт)
  heroQuote: z
    .string()
    .min(40)
    .max(700)
    .default(
      "Флористическая идея формируется из брифа: задача события, площадка, настроение, аудитория, сезонность, палитра и ограничения соединяются в цельную систему композиций. Не называйте конкретные растения, формы и конструкции без основания в источниках."
    )
    .meta({
      description:
        "Центральная идея флористики из брифа: образ, роль композиций и связь с гостевым сценарием. Не добавлять неподтверждённые растения, сезон, символы и конструкции.",
    }),

  missionTitle: z.string().min(2).max(30).default("Миссия").meta({
    description: "Заголовок блока с задачей флористического решения.",
  }),
  missionContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Сформировать цельное флористическое направление: поддержать сценарий и настроение события, определить роль композиций в ключевых зонах и учесть площадку, сезонность, безопасность и обслуживание."
    )
    .meta({
      description:
        "Задача флористики по брифу: функция композиций, атмосфера, аудитория, площадка и ожидаемое впечатление. Не придумывать растения, сезон или символику.",
    }),

  moodTitle: z.string().min(2).max(30).default("Ключевые смыслы").meta({
    description: "Заголовок блока с ключевыми смыслами и настроением.",
  }),
  moodContent: z
    .string()
    .min(20)
    .max(400)
    .default(
      "Ключевые смыслы раскрываются через силуэт композиций, плотность, ритм, палитру, фактуры, сосуды и способы размещения, которые заданы брифом или обоснованно предложены."
    )
    .meta({
      description:
        "Настроение, стилистика, палитра, растения или альтернативные материалы, сосуды и пространственные ориентиры из брифа. Не добавлять сезонную или символическую трактовку без основания.",
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
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Title",
            description: "Главный заголовок флористической концепции",
          })}
          className="uppercase font-[800] text-[48px] leading-[56px]"
          style={{ color: titleColor, fontFamily: titleFont }}
        >
          {slideData?.title || "КОНЦЕПЦИЯ ФЛОРИСТИЧЕСКОГО НАПРАВЛЕНИЯ"}
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
            {...promptTargetAttrs({
              path: "heroQuote",
              type: "field",
              name: "Hero quote",
              description: "Центральная идея флористики",
            })}
            className="font-[700] text-[24px] leading-[30px]"
            style={{ color: heroText, fontFamily: bodyFont }}
          >
            {slideData?.heroQuote ||
              "Флористическая идея формируется из задачи, площадки, настроения и ограничений события..."}
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
                description: "Заголовок блока с задачей",
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
                description: "Задача флористики по брифу",
              })}
              className="mt-[22px] font-[500] text-[24px] leading-[30px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
            >
              {slideData?.missionContent || "Сформировать цельное пространство для события..."}
            </div>
          </section>

          {/* Правая колонка */}
          <section className="flex flex-col">
            <div
              {...promptTargetAttrs({
                path: "moodTitle",
                type: "field",
                name: "Mood title",
                description: "Заголовок ключевых смыслов",
              })}
              className="font-[800] text-[28px] leading-[34px]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
            >
              {slideData?.moodTitle || "Ключевые смыслы"}
            </div>

            {/* Линия под заголовком */}
            <div className="mt-[12px] h-[2px] w-full opacity-70" style={{ backgroundColor: ruleColor }} />

            <div
              {...promptTargetAttrs({
                path: "moodContent",
                type: "field",
                name: "Mood content",
                description: "Ключевые смыслы и настроение",
              })}
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
