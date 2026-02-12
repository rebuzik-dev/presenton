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
    .default("Supporting image")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "header-quote-two-columns-lines-slide"
const layoutName = "Header Quote Two Columns Lines Slide"
const layoutDescription = "A slide with a header, a quote card, and two text columns with divider lines."

const Schema = z.object({
  title: z.string().min(5).max(40).default("КОНЦЕПЦИЯ МЕРОПРИЯТИЯ").meta({ description: "Header. Max 2 words" }),
  quote: z
    .string()
    .min(20)
    .max(220)
    .default(
      "Ключевая идея, суть концепта Ключевая идея, суть концепта Ключевая идея, суть концепта Ключевая идея, суть концепта"
    )
    .meta({ description: "Quote text. Max 28 words" }),
  leftTitle: z.string().min(3).max(20).default("Миссия").meta({ description: "Left column title. Max 1 word" }),
  rightTitle: z.string().min(3).max(30).default("Ключевые смыслы").meta({ description: "Right column title. Max 2 words" }),
  leftBody: z
    .string()
    .min(20)
    .max(240)
    .default(
      "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"
    )
    .meta({ description: "Left body. Max 28 words" }),
  rightBody: z
    .string()
    .min(20)
    .max(240)
    .default(
      "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"
    )
    .meta({ description: "Right body. Max 28 words" }),
})

type HeaderQuoteTwoColumnsLinesSlideData = z.infer<typeof Schema>

interface HeaderQuoteTwoColumnsLinesSlideLayoutProps {
  data?: Partial<HeaderQuoteTwoColumnsLinesSlideData>
}

const dynamicSlideLayout: React.FC<HeaderQuoteTwoColumnsLinesSlideLayoutProps> = ({ data: slideData }) => {
  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-16 pt-12 pb-10 flex flex-col">
        <div className="text-[56px] leading-[60px] font-[900] uppercase text-[#3f3f3f] overflow-hidden">
          {slideData?.title || "КОНЦЕПЦИЯ МЕРОПРИЯТИЯ"}
        </div>

        <div className="mt-10 rounded-[18px] bg-[#8F9499] shadow-[0_12px_18px_rgba(0,0,0,0.20)] px-14 py-10 flex gap-10 items-start">
          <div className="text-[64px] leading-[64px] font-[900] text-white -mt-2 flex-shrink-0">&laquo;</div>
          <div className="text-[26px] leading-[34px] font-[500] text-white overflow-hidden max-w-[980px]">
            {slideData?.quote ||
              "Ключевая идея, суть концепта Ключевая идея, суть концепта Ключевая идея, суть концепта Ключевая идея, суть концепта"}
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-20 flex-1 min-h-0">
          <div className="min-h-0">
            <div className="text-[24px] leading-[28px] font-[700] text-[#3f3f3f] overflow-hidden">
              {slideData?.leftTitle || "Миссия"}
            </div>
            <div className="mt-6 h-[2px] w-full bg-[#3f3f3f]/60"></div>
            <div className="mt-8 text-[22px] leading-[30px] font-[400] text-[#3f3f3f] overflow-hidden max-w-[520px]">
              {slideData?.leftBody ||
                "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
            </div>
          </div>

          <div className="min-h-0">
            <div className="text-[24px] leading-[28px] font-[700] text-[#3f3f3f] overflow-hidden">
              {slideData?.rightTitle || "Ключевые смыслы"}
            </div>
            <div className="mt-6 h-[2px] w-full bg-[#3f3f3f]/60"></div>
            <div className="mt-8 text-[22px] leading-[30px] font-[400] text-[#3f3f3f] overflow-hidden max-w-[520px]">
              {slideData?.rightBody ||
                "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

