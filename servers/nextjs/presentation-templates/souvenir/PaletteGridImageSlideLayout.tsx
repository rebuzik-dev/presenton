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
    .default("Supporting photo")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "palette-grid-image-slide"
const layoutName = "Palette Grid Image Slide"
const layoutDescription = "A slide with a header, a palette grid of color cards, and a large image."

const ColorCardSchema = z.object({
  hex: z.string().min(4).max(9).default("#DEDDDD").meta({ description: "Hex code. Max 1 word" }),
  name: z.string().min(3).max(28).default("Название цвета").meta({ description: "Color name. Max 3 words" }),
})

const Schema = z.object({
  title: z.string().min(5).max(30).default("ЦВЕТОВАЯ ПАЛИТРА").meta({ description: "Main header" }),
  leftHeader: z.string().min(3).max(30).default("Основные цвета").meta({ description: "Left column header (Primary colors)" }),
  rightHeader: z.string().min(3).max(40).default("Дополнительные цвета").meta({ description: "Right column header (Secondary colors)" }),
  primary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#DEDDDD", name: "Название цвета" },
      { hex: "#C2BAC2", name: "Название цвета" },
      { hex: "#999DA9", name: "Название цвета" },
    ])
    .meta({
      description:
        "LEFT column. Primary colors only. Order is important: render top-to-bottom as given (most important first). Max 3 items.",
    }),
  secondary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#81919E", name: "Название цвета" },
      { hex: "#5D7079", name: "Название цвета" },
      { hex: "#1A1C23", name: "Название цвета" },
    ])
    .meta({
      description:
        "RIGHT column. Secondary colors only. Order is important: render top-to-bottom as given. Max 3 items.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Event table setting photo",
  }).meta({ description: "Right image. Max 30 words" }),
})

type PaletteGridImageSlideData = z.infer<typeof Schema>

interface PaletteGridImageSlideLayoutProps {
  data?: Partial<PaletteGridImageSlideData>
}

const dynamicSlideLayout: React.FC<PaletteGridImageSlideLayoutProps> = ({ data: slideData }) => {
  const primary = slideData?.primary || []
  const secondary = slideData?.secondary || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const cardFont = resolveFontFamily(slideData, "color_card", rootFont, "body")
  const lightCardTextColor = resolveColor(slideData, "color_card", "color", "#3f3f3f", "text_primary")

  const ColorCard: React.FC<{ hex: string; name: string }> = ({ hex, name }) => {
    const isDark = hex.toUpperCase() === "#1A1C23" || hex.toUpperCase() === "#5D7079" || hex.toUpperCase() === "#81919E"
    const textColor = isDark ? "#FFFFFF" : lightCardTextColor
    return (
      <div className="h-[116px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div className={`text-[17px] leading-[21px] tracking-[0.4px] font-[700] ${isDark ? "text-white" : "text-[var(--style-text-primary)]"}`} style={{ color: textColor, fontFamily: cardFont }}>
          {hex}
        </div>
        <div className={`text-[18px] leading-[22px] font-[500] ${isDark ? "text-white" : "text-[var(--style-text-primary)]"}`} style={{ color: textColor, fontFamily: cardFont }}>
          {name}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[68px] pt-10 pb-12 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div className="text-[46px] leading-[52px] font-[900] uppercase text-[var(--style-text-primary)]" style={{ color: titleColor, fontFamily: titleFont }}>
            {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-5 h-[490px] content-start min-h-0">
            <div className="min-h-0">
              <div className="text-[22px] leading-[28px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                {slideData?.leftHeader || "Основные цвета"}
              </div>
              <div className="mt-4 grid gap-5">
                {primary.slice(0, 3).map((c, idx) => (
                  <ColorCard key={`p-${idx}`} hex={c.hex} name={c.name} />
                ))}
              </div>
            </div>

            <div className="min-h-0">
              <div className="text-[22px] leading-[28px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
                {slideData?.rightHeader || "Дополнительные цвета"}
              </div>
              <div className="mt-4 grid gap-5">
                {secondary.slice(0, 3).map((c, idx) => (
                  <ColorCard key={`s-${idx}`} hex={c.hex} name={c.name} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="h-full flex flex-col min-h-0">
          <div className="h-[52px]"></div>
          <div className="mt-6 w-full h-[490px] overflow-hidden">
            <img
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || "image"}
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



