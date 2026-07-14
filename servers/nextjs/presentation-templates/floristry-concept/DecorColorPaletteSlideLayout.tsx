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
    .max(260)
    .default("Photo for slide")
    .meta({
      description:
        "Референс палитры флористики по теме, стилю, площадке, растениям или альтернативным материалам из брифа. Не придумывать виды растений, конструкции, людей, логотипы и цвета.",
    }),
})

const layoutId = "color-palette-listing-slide"
const layoutName = "Color Palette Listing Slide"
const layoutDescription =
  "Палитра флористики: использовать брендовые цвета из брифа, а при их отсутствии предложить сочетание оттенков растений, материалов и фона с учётом сезона и площадки, если они известны."

const ColorItemSchema = z.object({
  hex: z
    .string()
    .min(4)
    .max(9)
    .meta({
      description:
        "HEX из брендовой палитры, если она задана; иначе уместный цвет, выведенный из брифа, площадки, настроения, формата и аудитории.",
    }),
  label: z
    .string()
    .min(2)
    .max(70)
    .meta({
      description:
        "Роль цвета в концепции: база, акцент, контраст, фон, флористика, материал или свет. Не связывать с неподтверждённой символикой.",
    }),
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
    .meta({ description: "Заголовок основных цветов, выбранных из брифа." }),
  secondaryTitle: z
    .string()
    .min(3)
    .max(40)
    .default("Дополнительные цвета")
    .meta({ description: "Заголовок дополнительных цветов, выбранных из брифа." }),
  primaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#2F3A3D", label: "Основной тон: задает характер и глубину визуальной системы" },
      { hex: "#F4F1EA", label: "Светлая база: поддерживает воздух и чистоту композиции" },
      { hex: "#B8794C", label: "Акцент: выделяет ключевые композиции и флористические детали" }
    ])
    .meta({
      description:
        "До трёх основных цветов из брендбука; если их нет — обоснованное сочетание из брифа. Порядок по значимости.",
    }),
  secondaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#D7C7B2", label: "Материальный оттенок: связывает фактуры, сосуды и композиции" },
      { hex: "#6F7D73", label: "Поддерживающий тон: балансирует флористику и фон" },
      { hex: "#FFFFFF", label: "Нейтральный свет: дает паузы и читабельность элементов" }
    ])
    .meta({
      description:
        "До трёх дополнительных цветов, поддерживающих концепцию, материалы, флористику, свет и пространство из брифа.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Moodboard-style decor palette reference based on the brief: event theme, venue, materials, floristics, lighting, and brand or inferred colors, cohesive editorial photo.",
  }).meta({
    description:
      "Поддерживающий референс палитры по брифу. Не навязывать конкретный цветок, конструкцию, предмет, людей, логотип или цвет.",
  }),
})

type ColorPaletteListingData = z.infer<typeof Schema>

interface ColorPaletteListingProps {
  data?: Partial<ColorPaletteListingData>
}

const dynamicSlideLayout: React.FC<ColorPaletteListingProps> = ({ data: slideData }) => {
  const primary = (slideData?.primaryColors || []).slice(0, 3)
  const secondary = (slideData?.secondaryColors || []).slice(0, 3)

  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const cardFont = resolveFontFamily(slideData, "color_card", rootFont, "body")

  const Card: React.FC<{ hex: string; label: string; pathPrefix: string; index: number }> = ({ hex, label, pathPrefix, index }) => {
    const resolvedTextColor = resolveContrastTextColor(hex)

    return (
      <div className="h-[124px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div
          {...promptTargetAttrs({
            path: `${pathPrefix}[${index}].hex`,
            type: "field",
            name: `Color ${index + 1} hex`,
            description: "HEX цветового образца",
          })}
          className="text-[17px] leading-[21px] tracking-[0.4px] font-[700]"
          style={{ color: resolvedTextColor, fontFamily: cardFont }}
        >
          {hex}
        </div>
        <div
          {...promptTargetAttrs({
            path: `${pathPrefix}[${index}].label`,
            type: "field",
            name: `Color ${index + 1} label`,
            description: "Роль цвета в концепции",
          })}
          className="text-[18px] leading-[22px] font-[500]"
          style={{ color: resolvedTextColor, fontFamily: cardFont }}
        >
          {label}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white z-20 mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="h-full px-[68px] pt-10 pb-10 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div className="text-[46px] leading-[52px] font-[900] uppercase text-[var(--style-text-primary)]" style={{ color: titleColor, fontFamily: titleFont }}>
            <span
              {...promptTargetAttrs({
                path: "title",
                type: "field",
                name: "Title",
                description: "Главный заголовок палитры",
              })}
            >
              {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 min-h-0">
            <div className="min-h-0">
              <div className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                <span
                  {...promptTargetAttrs({
                    path: "primaryTitle",
                    type: "field",
                    name: "Primary title",
                    description: "Заголовок основных цветов",
                  })}
                >
                  {slideData?.primaryTitle || "Основные цвета"}
                </span>
              </div>
              <div className="mt-4 grid gap-6">
                {primary.map((c, idx) => (
                  <Card key={`p-${idx}`} hex={c.hex} label={c.label} pathPrefix="primaryColors" index={idx} />
                ))}
              </div>
            </div>

            <div className="min-h-0">
              <div className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                <span
                  {...promptTargetAttrs({
                    path: "secondaryTitle",
                    type: "field",
                    name: "Secondary title",
                    description: "Заголовок дополнительных цветов",
                  })}
                >
                  {slideData?.secondaryTitle || "Дополнительные цвета"}
                </span>
              </div>
              <div className="mt-4 grid gap-6">
                {secondary.map((c, idx) => (
                  <Card key={`s-${idx}`} hex={c.hex} label={c.label} pathPrefix="secondaryColors" index={idx} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-full flex items-start justify-end">
          <div className="w-full h-[560px] overflow-hidden">
            <img
              {...promptTargetAttrs({
                path: "image.__image_prompt__",
                type: "image",
                name: "Palette image prompt",
                description: "Поддерживающий референс палитры",
              })}
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
