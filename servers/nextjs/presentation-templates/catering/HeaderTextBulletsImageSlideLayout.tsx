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
    .default("Конкретное блюдо или формат подачи, иллюстрирующий принципы меню из брифа")
    .meta({ description: "Крупный кадр меню или подачи. Не добавлять неподтверждённые блюда, текст или логотипы." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка меню")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-text-bullets-image-slide"
const layoutName = "Header Text Bullets Image Slide"
const layoutDescription =
  "Принципы меню: баланс, формат подачи, тайминг, аудитория и пищевые ограничения из брифа плюс уместные творческие предложения."

const Schema = z.object({
  title: z
    .string()
    .min(10)
    .max(65)
    .default("ОСНОВНЫЕ ПРИНЦИПЫ ФОРМИРОВАНИЯ МЕНЮ")
    .meta({ description: "Заголовок раздела о принципах формирования меню." }),
  lead: z
    .string()
    .min(10)
    .max(70)
    .default("Меню формируется по функциональной логике.")
    .meta({ description: "Короткая формулировка логики меню для этого мероприятия." }),
  listTitle: z
    .string()
    .min(3)
    .max(20)
    .default("Принципы:")
    .meta({ description: "Короткая подпись перед списком принципов." }),
  bullets: z
    .array(z.string().min(8).max(70).meta({ description: "Один конкретный принцип меню или подачи, основанный на брифе либо предложенный как решение." }))
    .min(2)
    .max(4)
    .default(["баланс лёгких и сытных позиций;", "адаптация под тайминг;", "универсальность для широкой аудитории."])
    .meta({ description: "От двух до четырёх разных принципов. Ограничения питания и конкретные блюда указывать только при наличии в брифе." }),
  footerNote: z
    .string()
    .min(6)
    .max(50)
    .default("Фокус — удобство и скорость потребления.")
    .meta({ description: "Короткий вывод о пользе выбранного решения для гостей или сценария." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Блюдо, напиток или порционная подача, напрямую связанная с принципами меню и форматом мероприятия из брифа",
  }).meta({ description: "Изображение иллюстрирует конкретный принцип меню и не повторяет общий вид сервисной зоны." }),
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
          {slideData?.title || "ОСНОВНЫЕ ПРИНЦИПЫ ФОРМИРОВАНИЯ МЕНЮ"}
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
              {(slideData?.lead || "Меню формируется по функциональной логике.").split(" ").slice(0, 3).join(" ")}
              <br />
              {(slideData?.lead || "Меню формируется по функциональной логике.").split(" ").slice(3).join(" ")}
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
              {slideData?.footerNote || "Фокус — удобство и скорость потребления."}
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



