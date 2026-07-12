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
    .default("Кейтеринг-решение для мероприятия на основе брифа")
    .meta({ description: "Отдельный кадр кейтеринг-решения: блюдо, формат подачи или сервисная зона. Без текста и случайных логотипов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка кейтеринг-решения")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-three-image-cards-slide"
const layoutName = "Header Three Image Cards Slide"
const layoutDescription =
  "Три разных кейтеринг-решения для мероприятия: форматы подачи, категории меню или сервисные зоны, выбранные из брифа либо предложенные в его рамках."

const CardSchema = z.object({
  title: z.string().min(3).max(28).default("Формат подачи").meta({ description: "Короткое название конкретного кейтеринг-решения. До 3 слов." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Конкретное кейтеринг-решение, связанное с названием карточки и условиями брифа",
  }).meta({ description: "Изображение решения из этой карточки; не повторять сцены других карточек." }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(35)
    .default("КЕЙТЕРИНГ-РЕШЕНИЯ")
    .meta({ description: "Заголовок раздела с вариантами меню, подачи или обслуживания." }),
  cards: z
    .array(CardSchema)
    .min(2)
    .max(4)
    .default([
      {
        title: "Основная подача",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Общий вид основной подачи блюд в формате мероприятия из брифа" },
      },
      {
        title: "Сервисная зона",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Сервисная зона кейтеринга, адаптированная к площадке и гостевому потоку" },
      },
      {
        title: "Деталь меню",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Крупный план блюда или порционной подачи, соответствующей меню и аудитории из брифа" },
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
          {slideData?.title || "КЕЙТЕРИНГ-РЕШЕНИЯ"}
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



