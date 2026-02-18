import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'

const ImageSchema = z.object({
  __image_url__: z.string().url().default("https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg").meta({
    description: "URL to image. Max 10 words",
  }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Decor photo")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("generic icon")
    .meta({ description: "Prompt used to generate or search the icon. Max 6 words" }),
})

const layoutId = "header-three-image-cards-slide"
const layoutName = "Header Three Image Cards Slide"
const layoutDescription = "A slide with a header and a row of image cards with titles."

const CardSchema = z.object({
  title: z.string().min(3).max(28).default("Заголовок").meta({ description: "Card title. Max 3 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Decor image",
  }).meta({ description: "Card image. Max 30 words" }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(35)
    .default("ПРЕДЛОЖЕНИЯ ПО ДЕКОРУ")
    .meta({ description: "Main header. Max 3 words" }),
  cards: z
    .array(CardSchema)
    .min(2)
    .max(4)
    .default([
      {
        title: "Цветочные композиции",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Flower decor" },
      },
      {
        title: "Сервировка",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Table setting" },
      },
      {
        title: "Декоративные элементы",
        image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Decor elements" },
      },
    ])
    .meta({ description: "Image cards list. Max 4 items" }),
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
        <div className="text-[52px] leading-[58px] font-[900] uppercase text-[var(--style-text-primary)]" style={{ color: titleColor, fontFamily: titleFont }}>
          {slideData?.title || "ПРЕДЛОЖЕНИЯ ПО ДЕКОРУ"}
        </div>

        <div className="mt-14 grid grid-cols-3 gap-7">
          {cards.slice(0, 3).map((c, idx) => (
            <div key={idx} className="relative h-[470px] overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                src={c.image.__image_url__}
                alt={c.image.__image_prompt__ || c.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0 left-0 right-0 px-6 pt-8 pb-5" style={{ background: `linear-gradient(to bottom, ${overlayColor}, transparent)` }}>
                <div className="text-white text-[22px] leading-[27px] font-[500] drop-shadow" style={{ color: cardTitleColor, fontFamily: cardTitleFont }}>{c.title}</div>
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



