import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'
import { promptTargetAttrs } from '@/app/(presentation-generator)/components/PromptTarget'

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "Служебный URL изображения." }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Поддерживающий кадр общей визуальной системы мероприятия")
    .meta({ description: "Описание поддерживающего изображения, если оно потребуется layout." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("нейтральный символ визуальной системы")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-quote-two-columns-slide"
const layoutName = "Header Quote Two Columns Slide"
const layoutDescription =
  "Главная идея визуального кода: смысл, настроение, принципы и связь с аудиторией и сценарием мероприятия из брифа."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(45)
    .default("КОНЦЕПЦИЯ И НАСТРОЕНИЕ")
    .meta({ description: "Заголовок раздела о смысле и настроении визуальной системы." }),
  quote: z
    .string()
    .min(20)
    .max(160)
    .default("Визуальный код объединяет пространство, коммуникации и детали в один узнаваемый образ мероприятия.")
    .meta({ description: "Одна ёмкая формулировка роли визуального кода в конкретном мероприятии. Не придумывать формат и аудиторию." }),
  leftColumnTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Ключевые смыслы")
    .meta({ description: "Короткий заголовок блока о смыслах и впечатлении аудитории." }),
  leftStrongLine: z
    .string()
    .min(10)
    .max(80)
    .default("Единый образ во всех точках контакта,")
    .meta({ description: "Главный принцип визуальной системы, следующий из концепции и задач мероприятия." }),
  leftWeakLine: z
    .string()
    .min(3)
    .max(60)
    .default("без стилистических разрывов между носителями.")
    .meta({ description: "Короткое продолжение главного принципа без новых неподтверждённых фактов." }),
  leftBody: z
    .string()
    .min(25)
    .max(220)
    .default(
      "Палитра, типографика, материалы и композиционные приёмы поддерживают нужное впечатление на всём гостевом пути."
    )
    .meta({ description: "Как визуальная система поддерживает гостевой путь. Использовать только известные зоны, носители и сценарные задачи." }),
  rightColumnTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Ключевая идея")
    .meta({ description: "Короткий заголовок блока с предлагаемым решением." }),
  rightBody: z
    .string()
    .min(12)
    .max(160)
    .default("Система адаптируется к формату события, аудитории и условиям площадки:")
    .meta({ description: "Вводная строка к решениям. Формат, аудиторию и площадку называть только при наличии в брифе." }),
  rightBullets: z
    .array(
      z
        .string()
        .min(6)
        .max(80)
        .meta({ description: "Отдельный принцип палитры, типографики, материалов или применения, подтверждённый брифом либо предложенный как решение." })
    )
    .min(1)
    .max(3)
    .default(["единая логика на разных носителях;", "выразительность без перегрузки визуальной среды."])
    .meta({ description: "До трёх конкретных принципов. Не добавлять стили, материалы или носители без основания в брифе." }),
})

type HeaderQuoteTwoColumnsSlideData = z.infer<typeof Schema>

interface HeaderQuoteTwoColumnsSlideLayoutProps {
  data?: Partial<HeaderQuoteTwoColumnsSlideData>
}

const dynamicSlideLayout: React.FC<HeaderQuoteTwoColumnsSlideLayoutProps> = ({ data: slideData }) => {
  const bullets = slideData?.rightBullets || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionTitleFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body")
  const quoteBackground = resolveColor(slideData, "quote_card", "background", "#D8D6D3", "surface")
  const quoteColor = resolveColor(slideData, "quote_card", "color", bodyColor, "text_primary")
  const quoteFont = resolveFontFamily(slideData, "quote_card", bodyFont, "body")
  const accentColor = resolveColor(slideData, "bullet_marker", "background", "#3f3f3f", "accent")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[72px] pt-10 pb-16 flex flex-col">
        <div
          className="text-[48px] leading-[54px] font-[800] uppercase text-[var(--style-text-primary)]"
          style={{ color: titleColor, fontFamily: titleFont }}
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Главный заголовок",
            description: "Название концепции",
            role: "main_title",
          })}
        >
          {slideData?.title || "КОНЦЕПЦИЯ И НАСТРОЕНИЕ"}
        </div>

        <div className="mt-7 rounded-[22px] bg-[#D8D6D3] shadow-[0_10px_18px_rgba(0,0,0,0.12)] px-12 py-8 flex items-center" style={{ backgroundColor: quoteBackground }}>
          <div
            className="text-[24px] leading-[32px] font-[500] text-[var(--style-text-primary)]"
            style={{ color: quoteColor, fontFamily: quoteFont }}
            {...promptTargetAttrs({
              path: "quote",
              type: "field",
              name: "Цитата",
              description: "Текст в серой quote-карточке",
              role: "quote",
            })}
          >
            {slideData?.quote ||
              "Визуальный код объединяет пространство, коммуникации и детали в один узнаваемый образ мероприятия."}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12">
          <div className="flex flex-col min-h-0">
            <div
              className="text-[29px] leading-[34px] font-[800] text-[var(--style-text-primary)]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
              {...promptTargetAttrs({
                path: "leftColumnTitle",
                type: "field",
                name: "Заголовок левой колонки",
                description: "Левый смысловой блок",
                role: "section_title",
              })}
            >
              {slideData?.leftColumnTitle || "Ключевые смыслы"}
            </div>

            <div className="mt-7 text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]" style={{ color: bodyColor, fontFamily: bodyFont }}>
              <span
                {...promptTargetAttrs({
                  path: "leftStrongLine",
                  type: "field",
                  name: "Левая акцентная строка",
                  description: "Первая часть текста левой колонки",
                  role: "body_emphasis",
                })}
              >
                {slideData?.leftStrongLine || "Единый образ во всех точках контакта,"}
              </span>{" "}
              <span
                {...promptTargetAttrs({
                  path: "leftWeakLine",
                  type: "field",
                  name: "Левая поддерживающая строка",
                  description: "Вторая часть текста левой колонки",
                  role: "body_support",
                })}
              >
                {slideData?.leftWeakLine || "без стилистических разрывов между носителями."}
              </span>
            </div>

            <div
              className="mt-6 text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500] max-w-[520px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
              {...promptTargetAttrs({
                path: "leftBody",
                type: "field",
                name: "Текст левой колонки",
                description: "Основной абзац левой колонки",
                role: "body",
              })}
            >
              {slideData?.leftBody ||
                "Палитра, типографика, материалы и композиционные приёмы поддерживают нужное впечатление на всём гостевом пути."}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div
              className="text-[29px] leading-[34px] font-[800] text-[var(--style-text-primary)]"
              style={{ color: bodyColor, fontFamily: sectionTitleFont }}
              {...promptTargetAttrs({
                path: "rightColumnTitle",
                type: "field",
                name: "Заголовок правой колонки",
                description: "Правый смысловой блок",
                role: "section_title",
              })}
            >
              {slideData?.rightColumnTitle || "Ключевая идея"}
            </div>

            <div
              className="mt-7 text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500] max-w-[560px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
              {...promptTargetAttrs({
                path: "rightBody",
                type: "field",
                name: "Текст правой колонки",
                description: "Вводный текст перед списком",
                role: "body",
              })}
            >
              {slideData?.rightBody ||
                "Решение адаптируется под формат события, состав гостей и условия площадки:"}
            </div>

            <ul className="mt-5 space-y-3 text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500] min-h-0" style={{ color: bodyColor, fontFamily: bodyFont }}>
              {bullets.map((t, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="mt-[14px] w-2.5 h-1 bg-[var(--style-accent)] flex-shrink-0" style={{ backgroundColor: accentColor }}></span>
                  <span
                    {...promptTargetAttrs({
                      path: `rightBullets[${idx}]`,
                      type: "field",
                      name: `Пункт списка ${idx + 1}`,
                      description: "Пункт списка в правой колонке",
                      role: "bullet",
                    })}
                  >
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



