import React from 'react'
import * as z from 'zod'

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
  title: z.string().min(5).max(30).default("ЦВЕТОВАЯ ПАЛИТРА").meta({ description: "Header. Max 2 words" }),
  leftHeader: z.string().min(3).max(30).default("Основные цвета").meta({ description: "Left group title. Max 2 words" }),
  rightHeader: z.string().min(3).max(40).default("Дополнительные цвета").meta({ description: "Right group title. Max 2 words" }),
  primary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#DEDDDD", name: "Название цвета" },
      { hex: "#C2BAC2", name: "Название цвета" },
      { hex: "#999DA9", name: "Название цвета" },
    ])
    .meta({ description: "Primary color cards. Max 3 items" }),
  secondary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#81919E", name: "Название цвета" },
      { hex: "#5D7079", name: "Название цвета" },
      { hex: "#1A1C23", name: "Название цвета" },
    ])
    .meta({ description: "Secondary color cards. Max 3 items" }),
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

  const ColorCard: React.FC<{ hex: string; name: string }> = ({ hex, name }) => {
    const isDark = hex.toUpperCase() === "#1A1C23" || hex.toUpperCase() === "#5D7079" || hex.toUpperCase() === "#81919E"
    return (
      <div className="h-[116px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div className={`text-[17px] leading-[21px] tracking-[0.4px] font-[700] ${isDark ? "text-white" : "text-[#3f3f3f]"}`}>
          {hex}
        </div>
        <div className={`text-[18px] leading-[22px] font-[500] ${isDark ? "text-white" : "text-[#3f3f3f]"}`}>
          {name}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-[68px] pt-10 pb-12 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div className="text-[46px] leading-[52px] font-[900] uppercase text-[#3f3f3f]">
            {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-5 h-[490px] content-start">
            <div className="text-[22px] leading-[28px] text-[#3f3f3f] font-[500]">
              {(slideData?.leftHeader || "Основные цвета").split(" ").slice(0, 2).join(" ")}
              <br />
              {(slideData?.leftHeader || "Основные цвета").split(" ").slice(2).join(" ") || " "}
            </div>
            <div className="text-[22px] leading-[28px] text-[#3f3f3f] font-[500]">
              {(slideData?.rightHeader || "Дополнительные цвета").split(" ").slice(0, 1).join(" ")}
              <br />
              {(slideData?.rightHeader || "Дополнительные цвета").split(" ").slice(1).join(" ")}
            </div>

            {primary.slice(0, 3).map((c, idx) => (
              <ColorCard key={`p-${idx}`} hex={c.hex} name={c.name} />
            ))}
            {secondary.slice(0, 3).map((c, idx) => (
              <ColorCard key={`s-${idx}`} hex={c.hex} name={c.name} />
            ))}
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

