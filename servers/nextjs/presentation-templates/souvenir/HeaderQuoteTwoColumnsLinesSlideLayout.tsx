import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'
import { promptTargetAttrs } from '@/app/(presentation-generator)/components/PromptTarget'

const ImageSchema = z.object({
  __image_url__: z.string().url().default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg").meta({
    description: "Служебный URL изображения.",
  }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Supporting image")
    .meta({ description: "Короткое ТЗ изображения, если оно требуется layout." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z.string().min(1).max(60).default("нейтральная иконка").meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "header-quote-two-columns-lines-slide"
const layoutName = "Header Quote Two Columns Lines Slide"
const layoutDescription =
  "Концепция сувенирной линейки: основная идея, задача для аудитории и ключевые принципы выбора изделий на основе брифа."

const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ ЛИНЕЙКИ").meta({ description: "Заголовок раздела о сувенирной концепции." }),
  quote: z
    .string()
    .min(20)
    .max(220)
    .default(
      "Сувенирная линейка продолжает идею мероприятия и превращает её в полезные, уместные для аудитории предметы."
    )
    .meta({ description: "Одна ёмкая идея линейки: какую связь с мероприятием и ценность для получателя она создаёт." }),
  leftTitle: z.string().min(3).max(20).default("Задача").meta({ description: "Заголовок блока с назначением сувениров." }),
  rightTitle: z.string().min(3).max(30).default("Принципы выбора").meta({ description: "Заголовок блока с критериями линейки." }),
  leftBody: z
    .string()
    .min(20)
    .max(240)
    .default(
      "Сформировать цельный набор для целевой аудитории, учитывая повод, способ вручения, практическую ценность и ограничения брифа."
    )
    .meta({ description: "Назначение линейки для конкретной аудитории. Не придумывать тираж, бюджет и способ вручения." }),
  rightBody: z
    .string()
    .min(20)
    .max(240)
    .default(
      "Изделия объединяются общей визуальной системой, материалами и логикой применения; конкретные позиции берутся из брифа или предлагаются как варианты."
    )
    .meta({ description: "Критерии выбора изделий: полезность, уместность, долговечность, производство и брендинг в рамках брифа." }),
})

type HeaderQuoteTwoColumnsLinesSlideData = z.infer<typeof Schema>

interface HeaderQuoteTwoColumnsLinesSlideLayoutProps {
  data?: Partial<HeaderQuoteTwoColumnsLinesSlideData>
}

const dynamicSlideLayout: React.FC<HeaderQuoteTwoColumnsLinesSlideLayoutProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionTitleFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body")
  const quoteBackground = resolveColor(slideData, "quote_card", "background", "#8F9499", "surface")
  const quoteTextColor = resolveColor(slideData, "quote_card", "color", "#FFFFFF")
  const quoteFont = resolveFontFamily(slideData, "quote_card", bodyFont, "body")
  const accentColor = resolveColor(slideData, "divider", "background", "#3f3f3f", "accent")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-16 pt-12 pb-10 flex flex-col">
        <div className="text-[56px] leading-[60px] font-[900] uppercase text-[var(--style-text-primary)] overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
          <span
            {...promptTargetAttrs({
              path: "title",
              type: "field",
              name: "Title",
              description: "Заголовок концепции линейки",
            })}
          >
            {slideData?.title || "КОНЦЕПЦИЯ ЛИНЕЙКИ"}
          </span>
        </div>

        <div className="mt-10 rounded-[18px] bg-[#8F9499] shadow-[0_12px_18px_rgba(0,0,0,0.20)] px-14 py-10 flex gap-10 items-start" style={{ backgroundColor: quoteBackground }}>
          <div className="text-[64px] leading-[64px] font-[900] text-white -mt-2 flex-shrink-0" style={{ color: quoteTextColor, fontFamily: titleFont }}>&laquo;</div>
          <div className="text-[26px] leading-[34px] font-[500] text-white overflow-hidden max-w-[980px]" style={{ color: quoteTextColor, fontFamily: quoteFont }}>
            <span
              {...promptTargetAttrs({
                path: "quote",
                type: "field",
                name: "Quote",
                description: "Главная идея линейки",
              })}
            >
              {slideData?.quote ||
                "Сувенирная линейка продолжает идею мероприятия и превращает её в полезные, уместные для аудитории предметы."}
            </span>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-20 flex-1 min-h-0">
          <div className="min-h-0">
            <div className="text-[24px] leading-[28px] font-[700] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: sectionTitleFont }}>
              <span
                {...promptTargetAttrs({
                  path: "leftTitle",
                  type: "field",
                  name: "Left title",
                  description: "Заголовок левой колонки",
                })}
              >
                {slideData?.leftTitle || "Задача"}
              </span>
            </div>
            <div className="mt-6 h-[2px] w-full bg-[var(--style-accent)]/60" style={{ backgroundColor: accentColor }}></div>
            <div className="mt-8 text-[22px] leading-[30px] font-[400] text-[var(--style-text-primary)] overflow-hidden max-w-[520px]" style={{ color: bodyColor, fontFamily: bodyFont }}>
              <span
                {...promptTargetAttrs({
                  path: "leftBody",
                  type: "field",
                  name: "Left body",
                  description: "Текст левой колонки",
                })}
              >
                {slideData?.leftBody ||
                  "Сформировать цельный набор для целевой аудитории, учитывая повод, способ вручения, практическую ценность и ограничения брифа."}
              </span>
            </div>
          </div>

          <div className="min-h-0">
            <div className="text-[24px] leading-[28px] font-[700] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: sectionTitleFont }}>
              <span
                {...promptTargetAttrs({
                  path: "rightTitle",
                  type: "field",
                  name: "Right title",
                  description: "Заголовок правой колонки",
                })}
              >
                {slideData?.rightTitle || "Принципы выбора"}
              </span>
            </div>
            <div className="mt-6 h-[2px] w-full bg-[var(--style-accent)]/60" style={{ backgroundColor: accentColor }}></div>
            <div className="mt-8 text-[22px] leading-[30px] font-[400] text-[var(--style-text-primary)] overflow-hidden max-w-[520px]" style={{ color: bodyColor, fontFamily: bodyFont }}>
              <span
                {...promptTargetAttrs({
                  path: "rightBody",
                  type: "field",
                  name: "Right body",
                  description: "Текст правой колонки",
                })}
              >
                {slideData?.rightBody ||
                  "Изделия объединяются общей визуальной системой, материалами и логикой применения; конкретные позиции берутся из брифа или предлагаются как варианты."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



