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
    .default("Photo for slide")
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

const layoutId = "header-color-cards-image-slide"
const layoutName = "Header Color Cards Image Slide"
const layoutDescription = "A slide with a header, grouped color cards, and a supporting image."

const ColorCardSchema = z.object({
  hex: z.string().min(4).max(9).default("#E6E6E6").meta({ description: "Hex code string. Max 1 word" }),
  description: z.string().min(6).max(70).default("Описание цвета").meta({ description: "Card description. Max 8 words" }),
  group: z.enum(["primary", "secondary"]).default("primary").meta({ description: "Group selector. Max 1 word" }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(40)
    .default("ЦВЕТОВАЯ ПАЛИТРА")
    .meta({ description: "Main header. Max 2 words" }),
  primaryTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Основные цвета")
    .meta({ description: "Primary group header. Max 2 words" }),
  secondaryTitle: z
    .string()
    .min(3)
    .max(40)
    .default("Дополнительные цвета")
    .meta({ description: "Secondary group header. Max 2 words" }),
  colorCards: z
    .array(ColorCardSchema)
    .min(4)
    .max(8)
    .default([
      { hex: "#E6E6E6", description: "Светло-серый, сервировка, скатерти", group: "primary" },
      { hex: "#C9C4BE", description: "Тёплый бежево-серый, подложки, текстиль", group: "primary" },
      { hex: "#999DA9", description: "Холодный серый, акценты и элементы", group: "primary" },
      { hex: "#7F8C8D", description: "Серо-зелёный, вторичные акценты, флористика", group: "secondary" },
      { hex: "#4F5D63", description: "Тёмный сланцевый, конструкции и опоры", group: "secondary" },
      { hex: "#1A1C23", description: "Графит, линии, края, заземление", group: "secondary" },
    ])
    .meta({ description: "Color cards list. Max 8 items" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Catering photo in neutral palette",
  }).meta({ description: "Supporting image. Max 30 words" }),
})

type HeaderColorCardsImageSlideData = z.infer<typeof Schema>

interface HeaderColorCardsImageSlideLayoutProps {
  data?: Partial<HeaderColorCardsImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderColorCardsImageSlideLayoutProps> = ({ data: slideData }) => {
  const cards = slideData?.colorCards || []
  const primary = cards.filter((c) => c.group === "primary")
  const secondary = cards.filter((c) => c.group === "secondary")

  const Card: React.FC<{ hex: string; description: string }> = ({ hex, description }) => {
    const isDark =
      hex.toUpperCase() === "#7F8C8D" || hex.toUpperCase() === "#4F5D63" || hex.toUpperCase() === "#1A1C23"
    const textClass = isDark ? "text-white" : "text-[#3f3f3f]"
    return (
      <div className="h-[124px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div className={`text-[17px] leading-[21px] tracking-[0.4px] font-[700] ${textClass}`}>{hex}</div>
        <div className={`text-[18px] leading-[22px] font-[500] ${textClass}`}>{description}</div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-[68px] pt-10 pb-10 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div className="text-[46px] leading-[52px] font-[900] uppercase text-[#3f3f3f]">
            {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 min-h-0">
            <div className="text-[24px] leading-[32px] text-[#3f3f3f] font-[500]">
              {(slideData?.primaryTitle || "Основные цвета").split(" ").slice(0, 2).join(" ")}
              <br />
              {(slideData?.primaryTitle || "Основные цвета").split(" ").slice(2).join(" ") || " "}
            </div>
            <div className="text-[24px] leading-[32px] text-[#3f3f3f] font-[500]">
              {(slideData?.secondaryTitle || "Дополнительные цвета").split(" ").slice(0, 1).join(" ")}
              <br />
              {(slideData?.secondaryTitle || "Дополнительные цвета").split(" ").slice(1).join(" ")}
            </div>

            {primary.slice(0, 3).map((c, idx) => (
              <Card key={`p-${idx}`} hex={c.hex} description={c.description} />
            ))}
            {secondary.slice(0, 3).map((c, idx) => (
              <Card key={`s-${idx}`} hex={c.hex} description={c.description} />
            ))}
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


