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
    .default("Фон обложки концепции подарочного набора, связанный с материалами, упаковкой и характером решения из брифа")
    .meta({ description: "Фон обложки без текста, случайных логотипов и конкретных компонентов, не указанных в брифе." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("generic icon")
    .meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "cover-background-kicker-title-slide"
const layoutName = "Cover Background Kicker Title Slide"
const layoutDescription =
  "Обложка концепции подарочного набора: тип документа и точное название мероприятия из брифа на нейтральном тематическом фоне."

const Schema = z.object({
  background: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Фактура материалов, упаковки или абстрактная композиция для подарочного набора, основанная на визуальном стиле мероприятия",
  }).meta({ description: "Фоновый кадр поддерживает концепцию, но не показывает вымышленные товары." }),
  kicker: z.string().min(3).max(40).default("Концепция подарочного набора").meta({ description: "Тип документа или раздела. До 4 слов." }),
  title: z.string().min(5).max(55).default("НАЗВАНИЕ МЕРОПРИЯТИЯ").meta({ description: "Название мероприятия точно из брифа, без добавления даты или места." }),
})

type CoverBackgroundKickerTitleSlideData = z.infer<typeof Schema>

interface CoverBackgroundKickerTitleSlideLayoutProps {
  data?: Partial<CoverBackgroundKickerTitleSlideData>
}

const dynamicSlideLayout: React.FC<CoverBackgroundKickerTitleSlideLayoutProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const kickerColor = resolveColor(slideData, "kicker", "color", "#5a5a5a", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const kickerFont = resolveFontFamily(slideData, "kicker", rootFont, "body")
  const overlayColor = resolveColor(slideData, "overlay", "background", "rgba(255,255,255,0.6)")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="absolute inset-0">
        <img
          {...promptTargetAttrs({
            path: "background.__image_prompt__",
            type: "image",
            name: "Фон обложки",
            description: "Фон концепции подарочного набора без вымышленных компонентов",
          })}
          src={slideData?.background?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
          alt={slideData?.background?.__image_prompt__ || "background"}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-white/60" style={{ backgroundColor: overlayColor }}></div>
      </div>

      <div className="relative h-full px-20 pt-[250px]">
        <div className="text-[26px] leading-[32px] text-[#5a5a5a] font-[500] overflow-hidden" style={{ color: kickerColor, fontFamily: kickerFont }}>
          <span
            {...promptTargetAttrs({
              path: "kicker",
              type: "field",
              name: "Тип документа",
              description: "Короткая строка над названием мероприятия",
            })}
          >
            {slideData?.kicker || "Концепция подарочного набора"}
          </span>
        </div>
        <div className="mt-6 text-[64px] leading-[70px] tracking-[0.5px] text-[var(--style-text-primary)] font-[900] uppercase overflow-hidden max-w-[980px]" style={{ color: titleColor, fontFamily: titleFont }}>
          <span
            {...promptTargetAttrs({
              path: "title",
              type: "field",
              name: "Название мероприятия",
              description: "Точное название мероприятия из брифа",
            })}
          >
            {slideData?.title || "НАЗВАНИЕ МЕРОПРИЯТИЯ"}
          </span>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



