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
    description: "URL to image. Max 10 words",
  }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Фирменный паттерн для сувенирной продукции, собранный из визуальных мотивов брифа")
    .meta({ description: "Бесшовный или модульный графический паттерн без случайного текста, логотипов и неподтверждённых символов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "header-paragraph-pattern-image-slide"
const layoutName = "Header Paragraph Pattern Image Slide"
const layoutDescription =
  "Фирменный паттерн сувенирной линейки: принцип построения, связь с концепцией и применение на изделиях или упаковке."

const Schema = z.object({
  title: z.string().min(3).max(30).default("ФИРМЕННЫЙ ПАТТЕРН").meta({ description: "Заголовок раздела о графическом паттерне." }),
  description: z
    .string()
    .min(20)
    .max(260)
    .default(
      "Паттерн развивает визуальную идею мероприятия и масштабируется на разные изделия, упаковку и сопроводительные материалы."
    )
    .meta({ description: "Кратко описать мотив, принцип построения и применение паттерна. Не придумывать символику, которой нет в брифе." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Модульный фирменный паттерн для сувенирной продукции, основанный на формах, ритме и настроении из брифа",
  }).meta({ description: "Крупное изображение паттерна без мокапа случайного товара и без читаемого текста." }),
})

type HeaderParagraphPatternImageSlideData = z.infer<typeof Schema>

interface HeaderParagraphPatternImageSlideLayoutProps {
  data?: Partial<HeaderParagraphPatternImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderParagraphPatternImageSlideLayoutProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-16 pt-12 pb-12">
        <div className="text-[56px] leading-[60px] font-[900] uppercase text-[var(--style-text-primary)] overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
          <span
            {...promptTargetAttrs({
              path: "title",
              type: "field",
              name: "Title",
              description: "Pattern header",
            })}
          >
            {slideData?.title || "ФИРМЕННЫЙ ПАТТЕРН"}
          </span>
        </div>

        <div className="mt-6 text-[18px] leading-[26px] text-[var(--style-text-primary)]/70 max-w-[980px] overflow-hidden" style={{ color: bodyColor, fontFamily: bodyFont }}>
          <span
            {...promptTargetAttrs({
              path: "description",
              type: "field",
              name: "Description",
              description: "Pattern paragraph",
            })}
          >
            {slideData?.description ||
              "Паттерн развивает визуальную идею мероприятия и масштабируется на разные изделия, упаковку и сопроводительные материалы."}
          </span>
        </div>

        <div className="mt-10 h-[490px] overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
          <img
            {...promptTargetAttrs({
              path: "image.__image_prompt__",
              type: "image",
              name: "Pattern image prompt",
              description: "Pattern image prompt",
            })}
            src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
            alt={slideData?.image?.__image_prompt__ || "pattern"}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



