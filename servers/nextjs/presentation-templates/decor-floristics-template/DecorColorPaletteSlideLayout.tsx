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
    .default("Photo for slide")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const layoutId = "color-palette-listing-slide"
const layoutName = "Color Palette Listing Slide"
const layoutDescription = "A slide with grouped color cards and a supporting image."

const ColorItemSchema = z.object({
  hex: z
    .string()
    .min(4)
    .max(9)
    .meta({ description: "Hex code string" }),
  label: z
    .string()
    .min(2)
    .max(70)
    .meta({ description: "Color label text" }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(40)
    .default("ЦВЕТОВАЯ ПАЛИТРА")
    .meta({ description: "Main header" }),
  primaryTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Основные цвета")
    .meta({ description: "Left column header (Primary colors)" }),
  secondaryTitle: z
    .string()
    .min(3)
    .max(40)
    .default("Дополнительные цвета")
    .meta({ description: "Right column header (Secondary colors)" }),
  primaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#F2C94C", label: "Мимозный жёлтый (акцентный цвет, символ весны и праздника)" },
      { hex: "#6F9FA3", label: "Мягкий бирюзово-голубой (основной фон, лёгкость и статусность)" },
      { hex: "#FFFFFF", label: "Чистый белый (официальность, минимализм)" }
    ])
    .meta({
      description:
        "LEFT column. Primary colors only. Order is important: render top-to-bottom as given (most important first). Max 3 items.",
    }),
  secondaryColors: z
    .array(ColorItemSchema)
    .min(1)
    .max(3)
    .default([
      { hex: "#ebe45e", label: "Светлый тёплый бежево- жёлтый (поддержка флористической темы и тепла)" },
      { hex: "#2F4F5B", label: "Глубокий серо-бирюзовый (контраст, деловой характер)" },
      { hex: "#A7BFC2", label: "Пыльный светло-голубой (баланс и мягкость визуала)" }
    ])
    .meta({
      description:
        "RIGHT column. Secondary colors only. Order is important: render top-to-bottom as given. Max 3 items.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Floral installation with lush mimosa branches and eucalyptus on cylindrical plinths of different heights. Many burning pillar candles in glass holders around. Background with a glowing circular arch and soft fabric drapery. Soft studio lighting, aesthetic interior design.",
  }).meta({ description: "Supporting image. Max 30 words" }),
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

  const Card: React.FC<{ hex: string; label: string }> = ({ hex, label }) => {
    const resolvedTextColor = isDarkHex(hex)
      ? "#FFFFFF"
      : resolveColor(slideData, "color_card", "color", "#3f3f3f", "text_primary")

    return (
      <div className="h-[124px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div className="text-[17px] leading-[21px] tracking-[0.4px] font-[700]" style={{ color: resolvedTextColor, fontFamily: cardFont }}>
          {hex}
        </div>
        <div className="text-[18px] leading-[22px] font-[500]" style={{ color: resolvedTextColor, fontFamily: cardFont }}>
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
            {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 min-h-0">
            <div className="min-h-0">
              <div className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                {slideData?.primaryTitle || "Основные цвета"}
              </div>
              <div className="mt-4 grid gap-6">
                {primary.map((c, idx) => (
                  <Card key={`p-${idx}`} hex={c.hex} label={c.label} />
                ))}
              </div>
            </div>

            <div className="min-h-0">
              <div className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                {slideData?.secondaryTitle || "Дополнительные цвета"}
              </div>
              <div className="mt-4 grid gap-6">
                {secondary.map((c, idx) => (
                  <Card key={`s-${idx}`} hex={c.hex} label={c.label} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-full flex items-start justify-end">
          <div className="w-full h-[560px] overflow-hidden">
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
