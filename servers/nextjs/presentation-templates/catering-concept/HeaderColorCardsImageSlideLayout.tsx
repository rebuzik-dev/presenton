import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveContrastTextColor,
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
    .default("Кейтеринг-сцена, показывающая применение палитры в подаче, сервировке или сервисной зоне")
    .meta({ description: "Поддерживающий кадр палитры: показать её на релевантных объектах кейтеринга без случайного текста и логотипов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка цветовой палитры")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-color-cards-image-slide"
const layoutName = "Header Color Cards Image Slide"
const layoutDescription =
  "Палитра кейтеринга: использовать фирменные цвета из брифа, а при их отсутствии предложить сочетание под формат, аудиторию и атмосферу мероприятия."

const ColorCardSchema = z.object({
  hex: z.string().min(4).max(9).default("#E6E6E6").meta({ description: "HEX из брендбука или предложенный цвет, если палитра не задана." }),
  description: z.string().min(6).max(70).default("Роль цвета в кейтеринге").meta({ description: "Практическая роль цвета: фон, текстиль, посуда, упаковка, еда или акцент." }),
  group: z.enum(["primary", "secondary"]).default("primary").meta({ description: "Группа цвета: основной или дополнительный." }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(40)
    .default("ЦВЕТОВАЯ ПАЛИТРА")
    .meta({ description: "Универсальный заголовок раздела с палитрой." }),
  primaryTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Основные цвета")
    .meta({ description: "Заголовок группы основных цветов." }),
  secondaryTitle: z
    .string()
    .min(3)
    .max(40)
    .default("Дополнительные цвета")
    .meta({ description: "Заголовок группы дополнительных цветов." }),
  colorCards: z
    .array(ColorCardSchema)
    .min(4)
    .max(8)
    .default([
      { hex: "#F2EFE8", description: "Светлая база для посуды и поверхностей", group: "primary" },
      { hex: "#3F474B", description: "Основной контраст для текстиля и оборудования", group: "primary" },
      { hex: "#B58A56", description: "Тёплый акцент для деталей подачи", group: "primary" },
      { hex: "#D6C7B5", description: "Поддерживающий оттенок материалов и упаковки", group: "secondary" },
      { hex: "#6D7A70", description: "Натуральный акцент для свежих продуктов", group: "secondary" },
      { hex: "#FFFFFF", description: "Нейтральный фон для чистоты композиции", group: "secondary" },
    ])
    .meta({
      description:
        "От четырёх до восьми цветов: сначала фирменная палитра из брифа, иначе обоснованное предложение. Основные и дополнительные цвета не дублировать.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Кейтеринг-сцена с посудой, текстилем, упаковкой или подачей, демонстрирующая выбранную палитру в контексте мероприятия",
  }).meta({ description: "Изображение показывает применение палитры, а не повторяет список HEX." }),
})

type HeaderColorCardsImageSlideData = z.infer<typeof Schema>

interface HeaderColorCardsImageSlideLayoutProps {
  data?: Partial<HeaderColorCardsImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderColorCardsImageSlideLayoutProps> = ({ data: slideData }) => {
  const cards = slideData?.colorCards || []
  const indexedCards = cards.map((card, index) => ({ card, index }))
  const primary = indexedCards.filter(({ card }) => card.group === "primary")
  const secondary = indexedCards.filter(({ card }) => card.group === "secondary")
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const cardFont = resolveFontFamily(slideData, "color_card", rootFont, "body")

  const Card: React.FC<{ hex: string; description: string; index: number }> = ({ hex, description, index }) => {
    const resolvedTextColor = resolveContrastTextColor(hex)
    return (
      <div className="h-[124px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div
          className="text-[17px] leading-[21px] tracking-[0.4px] font-[700]"
          style={{ color: resolvedTextColor, fontFamily: cardFont }}
          {...promptTargetAttrs({
            path: `colorCards[${index}].hex`,
            type: "field",
            name: `Цвет карточки ${index + 1}`,
            description: "Hex-код цветового блока",
            role: "color_card_hex",
          })}
        >
          {hex}
        </div>
        <div
          className="text-[18px] leading-[22px] font-[500]"
          style={{ color: resolvedTextColor, fontFamily: cardFont }}
          {...promptTargetAttrs({
            path: `colorCards[${index}].description`,
            type: "field",
            name: `Описание цветовой карточки ${index + 1}`,
            description: "Назначение цвета в палитре",
            role: "color_card_description",
          })}
        >
          {description}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[68px] pt-10 pb-10 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div
            className="text-[46px] leading-[52px] font-[900] uppercase text-[var(--style-text-primary)]"
            style={{ color: titleColor, fontFamily: titleFont }}
            {...promptTargetAttrs({
              path: "title",
              type: "field",
              name: "Главный заголовок",
              description: "Название слайда с палитрой",
              role: "main_title",
            })}
          >
            {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
          </div>

          <div className="mt-6 grid grid-cols-2 items-start gap-x-6 gap-y-4 min-h-0">
            <div
              className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]"
              style={{ color: titleColor, fontFamily: sectionFont }}
              {...promptTargetAttrs({
                path: "primaryTitle",
                type: "field",
                name: "Заголовок основных цветов",
                description: "Название левой группы палитры",
                role: "primary_palette_title",
              })}
            >
              {slideData?.primaryTitle || "Основные цвета"}
            </div>
            <div
              className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]"
              style={{ color: titleColor, fontFamily: sectionFont }}
              {...promptTargetAttrs({
                path: "secondaryTitle",
                type: "field",
                name: "Заголовок дополнительных цветов",
                description: "Название правой группы палитры",
                role: "secondary_palette_title",
              })}
            >
              {slideData?.secondaryTitle || "Дополнительные цвета"}
            </div>
            <div className="grid gap-6 min-h-0">
              {primary.slice(0, 3).map(({ card, index }) => (
                <Card key={`p-${index}`} hex={card.hex} description={card.description} index={index} />
              ))}
            </div>
            <div className="grid gap-6 min-h-0">
              {secondary.slice(0, 3).map(({ card, index }) => (
                <Card key={`s-${index}`} hex={card.hex} description={card.description} index={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="h-full flex items-start justify-end">
          <div
            className="w-full h-[560px] overflow-hidden"
            {...promptTargetAttrs({
              path: "image.__image_prompt__",
              type: "image",
              name: "Изображение палитры",
              description: "Поддерживающее фото справа",
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


