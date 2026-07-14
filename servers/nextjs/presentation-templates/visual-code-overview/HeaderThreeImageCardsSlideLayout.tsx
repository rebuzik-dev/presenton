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
    .default("Применение визуального кода в отдельной точке контакта мероприятия")
    .meta({ description: "Отдельный кадр носителя, зоны или детали визуальной системы. Без случайного текста и логотипов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка точки контакта")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-three-image-cards-slide"
const layoutName = "Header Three Image Cards Slide"
const layoutDescription =
  "Три разных применения визуального кода: пространство, коммуникационный носитель и деталь, выбранные из брифа либо предложенные в его рамках."

const CardSchema = z.object({
  title: z.string().min(3).max(28).default("Точка контакта").meta({ description: "Короткое название конкретного применения визуального кода. До 3 слов." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Конкретное применение визуального кода, связанное с названием карточки и условиями брифа",
  }).meta({ description: "Изображение решения из этой карточки; не повторять сцены других карточек." }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(35)
    .default("ТОЧКИ КОНТАКТА")
    .meta({ description: "Заголовок раздела с применениями визуального кода." }),
  cards: z
    .array(CardSchema)
    .min(2)
    .max(4)
    .default([
      {
        title: "Пространство",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Общий вид применения визуального кода в пространстве мероприятия" },
      },
      {
        title: "Коммуникации",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Навигационный или коммуникационный носитель, адаптированный к площадке" },
      },
      {
        title: "Деталь",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Крупный план материала, фактуры или графического акцента визуальной системы" },
      },
    ])
    .meta({ description: "От двух до четырёх разных решений; интерфейс показывает первые три. Названия и сцены не должны дублироваться." }),
})

type HeaderThreeImageCardsSlideData = z.infer<typeof Schema>

interface HeaderThreeImageCardsSlideLayoutProps {
  data?: Partial<HeaderThreeImageCardsSlideData>
}

const dynamicSlideLayout: React.FC<HeaderThreeImageCardsSlideLayoutProps> = ({ data: slideData }) => {
  const cards = slideData?.cards || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const cardTitleColor = resolveColor(slideData, "card_title", "color", "#FFFFFF")
  const cardTitleFont = resolveFontFamily(slideData, "card_title", rootFont, "heading")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")
  const overlayColor = resolveColor(slideData, "card_overlay", "background", "rgba(0,0,0,0.45)")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[72px] pt-12 pb-12">
        <div
          className="text-[52px] leading-[58px] font-[900] uppercase text-[var(--style-text-primary)]"
          style={{ color: titleColor, fontFamily: titleFont }}
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Главный заголовок",
            description: "Название слайда с карточками",
            role: "main_title",
          })}
        >
          {slideData?.title || "ТОЧКИ КОНТАКТА"}
        </div>

        <div className="mt-14 grid grid-cols-3 gap-7">
          {cards.slice(0, 3).map((c, idx) => (
            <div
              key={idx}
              className="relative h-[470px] overflow-hidden bg-[var(--style-surface)]"
              style={{ backgroundColor: surfaceColor }}
              {...promptTargetAttrs({
                path: `cards[${idx}].image.__image_prompt__`,
                type: "image",
                name: `Изображение карточки ${idx + 1}`,
                description: "Отдельный кадр решения, связанный с подписью карточки",
                role: "card_image",
              })}
            >
              <img
                src={c.image.__image_url__}
                alt={c.image.__image_prompt__ || c.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0 left-0 right-0 px-6 pt-8 pb-5" style={{ background: `linear-gradient(to bottom, ${overlayColor}, transparent)` }}>
                <div
                  className="text-white text-[22px] leading-[27px] font-[500] drop-shadow"
                  style={{ color: cardTitleColor, fontFamily: cardTitleFont }}
                  {...promptTargetAttrs({
                    path: `cards[${idx}].title`,
                    type: "field",
                    name: `Название карточки ${idx + 1}`,
                    description: "Подпись поверх изображения",
                    role: "card_title",
                  })}
                >
                  {c.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



