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
    .default("Материал, графический приём или деталь пространства, иллюстрирующая принципы визуального кода")
    .meta({ description: "Крупный кадр материала или детали. Не добавлять неподтверждённый текст, объекты или логотипы." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка визуального принципа")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-text-bullets-image-slide"
const layoutName = "Header Text Bullets Image Slide"
const layoutDescription =
  "Принципы визуального кода: композиция, масштаб, материалы, типографика и связь с аудиторией из брифа плюс уместные творческие предложения."

const Schema = z.object({
  title: z
    .string()
    .min(10)
    .max(65)
    .default("ОСНОВНЫЕ ПРИНЦИПЫ ВИЗУАЛЬНОГО КОДА")
    .meta({ description: "Заголовок раздела о принципах визуальной системы." }),
  lead: z
    .string()
    .min(10)
    .max(70)
    .default("Визуальная система строится по единой логике.")
    .meta({ description: "Короткая формулировка логики визуального кода этого мероприятия." }),
  listTitle: z
    .string()
    .min(3)
    .max(20)
    .default("Принципы:")
    .meta({ description: "Короткая подпись перед списком принципов." }),
  bullets: z
    .array(z.string().min(8).max(70).meta({ description: "Один конкретный принцип композиции, материалов или коммуникации, основанный на брифе либо предложенный как решение." }))
    .min(2)
    .max(4)
    .default(["единая композиционная логика;", "адаптация к масштабу носителя;", "узнаваемость в разных точках контакта."])
    .meta({ description: "От двух до четырёх разных принципов. Конкретные носители и материалы указывать только при наличии в брифе." }),
  footerNote: z
    .string()
    .min(6)
    .max(50)
    .default("Фокус — целостность и узнаваемость образа.")
    .meta({ description: "Короткий вывод о пользе выбранного решения для гостей или сценария." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Материал, графический приём или пространственная деталь, напрямую связанная с принципами визуального кода",
  }).meta({ description: "Изображение иллюстрирует конкретный визуальный принцип и не повторяет общий вид пространства." }),
})

type HeaderTextBulletsImageSlideData = z.infer<typeof Schema>

interface HeaderTextBulletsImageSlideLayoutProps {
  data?: Partial<HeaderTextBulletsImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderTextBulletsImageSlideLayoutProps> = ({ data: slideData }) => {
  const bullets = slideData?.bullets || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body")
  const accentColor = resolveColor(slideData, "bullet_marker", "background", "#3f3f3f", "accent")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[72px] pt-12 pb-12">
        <div
          className="text-[50px] leading-[56px] font-[900] uppercase text-[var(--style-text-primary)]"
          style={{ color: titleColor, fontFamily: titleFont }}
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Главный заголовок",
            description: "Основное сообщение слайда",
            role: "main_title",
          })}
        >
          {slideData?.title || "ОСНОВНЫЕ ПРИНЦИПЫ ВИЗУАЛЬНОГО КОДА"}
        </div>

        <div className="mt-8 grid grid-cols-[1fr_1.35fr] gap-10 items-start">
          <div className="pt-1">
            <div
              className="text-[24px] leading-[32px] font-[700] text-[var(--style-text-primary)]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
              {...promptTargetAttrs({
                path: "lead",
                type: "field",
                name: "Вводный текст",
                description: "Короткое пояснение перед списком",
                role: "lead_text",
              })}
            >
              {(slideData?.lead || "Визуальная система строится по единой логике.").split(" ").slice(0, 3).join(" ")}
              <br />
              {(slideData?.lead || "Визуальная система строится по единой логике.").split(" ").slice(3).join(" ")}
            </div>

            <div
              className="mt-7 text-[24px] leading-[32px] font-[600] text-[var(--style-text-primary)]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
              {...promptTargetAttrs({
                path: "listTitle",
                type: "field",
                name: "Заголовок списка",
                description: "Подпись перед пунктами списка",
                role: "list_title",
              })}
            >
              {slideData?.listTitle || "Принципы:"}
            </div>

            <ul className="mt-5 space-y-5 text-[24px] leading-[32px] font-[500] text-[var(--style-text-primary)]" style={{ color: bodyColor, fontFamily: bodyFont }}>
              {bullets.map((t, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="mt-[14px] w-2.5 h-1 bg-[var(--style-accent)] flex-shrink-0" style={{ backgroundColor: accentColor }}></span>
                  <span
                    {...promptTargetAttrs({
                      path: `bullets[${idx}]`,
                      type: "field",
                      name: `Пункт списка ${idx + 1}`,
                      description: "Отдельный смысловой пункт списка",
                      role: "bullet_item",
                    })}
                  >
                    {t}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="mt-7 text-[24px] leading-[32px] font-[500] text-[var(--style-text-primary)] max-w-[420px]"
              style={{ color: bodyColor, fontFamily: bodyFont }}
              {...promptTargetAttrs({
                path: "footerNote",
                type: "field",
                name: "Финальная ремарка",
                description: "Короткий вывод или уточнение внизу текстового блока",
                role: "footer_note",
              })}
            >
              {slideData?.footerNote || "Фокус — целостность и узнаваемость образа."}
            </div>
          </div>

          <div
            className="w-full h-[470px] overflow-hidden bg-[var(--style-surface)]"
            style={{ backgroundColor: surfaceColor }}
            {...promptTargetAttrs({
              path: "image.__image_prompt__",
              type: "image",
              name: "Основное изображение",
              description: "Крупный визуальный акцент справа",
              role: "supporting_image",
            })}
          >
            <img
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || slideData?.title || ""}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



