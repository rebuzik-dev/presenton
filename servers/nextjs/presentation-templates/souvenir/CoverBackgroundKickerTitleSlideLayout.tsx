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
    .default("Soft abstract background")
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

const layoutId = "cover-background-kicker-title-slide"
const layoutName = "Cover Background Kicker Title Slide"
const layoutDescription = "A slide with a full background image, a kicker, and a large title."

const Schema = z.object({
  background: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Abstract light background with soft shapes",
  }).meta({ description: "Background image. Max 30 words" }),
  kicker: z.string().min(3).max(40).default("Наименование типа документа").meta({ description: "Kicker line. Max 4 words" }),
  title: z.string().min(5).max(55).default("НАИМЕНОВАНИЕ МЕРОПРИЯТИЯ").meta({ description: "Main title. Max 3 words" }),
})

type CoverBackgroundKickerTitleSlideData = z.infer<typeof Schema>

interface CoverBackgroundKickerTitleSlideLayoutProps {
  data?: Partial<CoverBackgroundKickerTitleSlideData>
}

const dynamicSlideLayout: React.FC<CoverBackgroundKickerTitleSlideLayoutProps> = ({ data: slideData }) => {
  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="absolute inset-0">
        <img
          src={slideData?.background?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
          alt={slideData?.background?.__image_prompt__ || "background"}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-white/60"></div>
      </div>

      <div className="relative h-full px-20 pt-[250px]">
        <div className="text-[26px] leading-[32px] text-[#5a5a5a] font-[500] overflow-hidden">
          {slideData?.kicker || "Наименование типа документа"}
        </div>
        <div className="mt-6 text-[64px] leading-[70px] tracking-[0.5px] text-[#3f3f3f] font-[900] uppercase overflow-hidden max-w-[980px]">
          {slideData?.title || "НАИМЕНОВАНИЕ МЕРОПРИЯТИЯ"}
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

