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
    .default("Pattern image")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "header-paragraph-pattern-image-slide"
const layoutName = "Header Paragraph Pattern Image Slide"
const layoutDescription = "A slide with a header, a paragraph, and a large pattern image."

const Schema = z.object({
  title: z.string().min(3).max(30).default("ФИРМЕННЫЙ ПАТТЕРН").meta({ description: "Header. Max 2 words" }),
  description: z
    .string()
    .min(20)
    .max(260)
    .default(
      "Описание паттерна Описание паттерна Описание паттерна Описание паттерна Описание паттерна Описание паттерна"
    )
    .meta({ description: "Paragraph text. Max 32 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Soft abstract brand pattern",
  }).meta({ description: "Pattern image. Max 30 words" }),
})

type HeaderParagraphPatternImageSlideData = z.infer<typeof Schema>

interface HeaderParagraphPatternImageSlideLayoutProps {
  data?: Partial<HeaderParagraphPatternImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderParagraphPatternImageSlideLayoutProps> = ({ data: slideData }) => {
  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-16 pt-12 pb-12">
        <div className="text-[56px] leading-[60px] font-[900] uppercase text-[#3f3f3f] overflow-hidden">{slideData?.title || "ФИРМЕННЫЙ ПАТТЕРН"}</div>

        <div className="mt-6 text-[18px] leading-[26px] text-[#3f3f3f]/70 max-w-[980px] overflow-hidden">
          {slideData?.description ||
            "Описание паттерна Описание паттерна Описание паттерна Описание паттерна Описание паттерна Описание паттерна"}
        </div>

        <div className="mt-10 h-[490px] overflow-hidden bg-[#E6E6E6]">
          <img
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

