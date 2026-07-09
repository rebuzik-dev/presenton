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
    .max(260)
    .default("Photo for slide")
    .meta({
      description:
        "Mood/reference image prompt for the decor palette. Use brief-derived theme, style, venue, materials, floristics, and palette; do not invent fixed flowers, constructions, people, logos, or colors.",
    }),
})

const layoutId = "color-palette-listing-slide"
const layoutName = "Color Palette Listing Slide"
const layoutDescription =
  "A brief-driven color palette slide: derive primary and secondary colors from brand inputs when provided, otherwise from event mood, venue, audience, season, format, and desired style."

const ColorItemSchema = z.object({
  hex: z
    .string()
    .min(4)
    .max(9)
    .meta({
      description:
        "Hex color from the brand palette if provided; otherwise choose a role-appropriate color inferred from the brief, venue, mood, format, audience, and desired style.",
    }),
  label: z
    .string()
    .min(2)
    .max(70)
    .meta({
      description:
        "Explain this color's role in the concept, such as base, accent, contrast, background, floristics, material, or lighting. Do not tie it to unsupported symbols.",
    }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(40)
    .default("ЦВЕТОВАЯ ПАЛИТРА")
    .meta({ description: "Universal palette section title." }),
  primaryTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Основные цвета")
    .meta({ description: "Header for the main palette colors selected from the brief." }),
  secondaryTitle: z
    .string()
    .min(3)
    .max(40)
    .default("Дополнительные цвета")
    .meta({ description: "Header for secondary/supporting colors selected from the brief." }),
  primaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#2F3A3D", label: "Основной тон: задает характер и глубину визуальной системы" },
      { hex: "#F4F1EA", label: "Светлая база: поддерживает воздух и чистоту композиции" },
      { hex: "#B8794C", label: "Акцент: выделяет ключевые зоны и детали оформления" }
    ])
    .meta({
      description:
        "LEFT column. Select up to 3 primary colors from brand guidance if present; otherwise infer them from the brief. Order top-to-bottom by importance.",
    }),
  secondaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#D7C7B2", label: "Материальный оттенок: связывает фактуры, мебель и декор" },
      { hex: "#6F7D73", label: "Поддерживающий тон: балансирует флористику и фон" },
      { hex: "#FFFFFF", label: "Нейтральный свет: дает паузы и читабельность элементов" }
    ])
    .meta({
      description:
        "RIGHT column. Select up to 3 secondary colors that support the brief-derived concept, materials, floristics, lighting, and spatial context.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Moodboard-style decor palette reference based on the brief: event theme, venue, materials, floristics, lighting, and brand or inferred colors, cohesive editorial photo.",
  }).meta({
    description:
      "Supporting mood/reference image. Build it from the brief and palette logic; do not force any specific flower, structure, object, people, logo, or color.",
  }),
})

type ColorPaletteListingData = z.infer<typeof Schema>

interface ColorPaletteListingProps {
  data?: Partial<ColorPaletteListingData>
}

const isDarkHex = (hex: string): boolean => {
  const normalized = hex.replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized

  if (expanded.length !== 6) {
    return false
  }

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance < 0.55
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
    const resolvedTextColor = isDarkHex(hex)
      ? "#FFFFFF"
      : resolveColor(slideData, "color_card", "color", "#3f3f3f", "text_primary")

    return (
      <div className="h-[124px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div
          {...promptTargetAttrs({
            path: `${pathPrefix}[${index}].hex`,
            type: "field",
            name: `Color ${index + 1} hex`,
            description: "Color swatch hex value",
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
            description: "Color swatch label",
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
                description: "Main palette header",
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
                    description: "Primary colors section title",
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
                    description: "Secondary colors section title",
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
                description: "Supporting moodboard image prompt",
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
