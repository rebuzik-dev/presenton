import React from 'react'
import * as z from 'zod'

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "URL to image. Max 10 words" }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Abstract presentation image")
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

const layoutId = "cover-kicker-title-slide"
const layoutName = "Cover Kicker Title Slide"
const layoutDescription = "A slide with a soft background and a kicker and a large title."

const Schema = z.object({
  kicker: z
    .string()
    .min(3)
    .max(40)
    .default("Концепция кейтеринга")
    .meta({ description: "Small header line. Max 4 words" }),
  title: z
    .string()
    .min(5)
    .max(55)
    .default("НАИМЕНОВАНИЕ МЕРОПРИЯТИЯ")
    .meta({ description: "Main large title. Max 3 words" }),
})

type CoverKickerTitleSlideData = z.infer<typeof Schema>

interface CoverKickerTitleSlideLayoutProps {
  data?: Partial<CoverKickerTitleSlideData>
}

const dynamicSlideLayout: React.FC<CoverKickerTitleSlideLayoutProps> = ({ data: slideData }) => {
  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden font-['Inter']">
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-40 w-[720px] h-[520px] rounded-full bg-[#EAEAEA] opacity-60 blur-2xl"></div>
        <div className="absolute -bottom-40 -right-48 w-[880px] h-[640px] rounded-full bg-[#D8D6D3] opacity-55 blur-2xl"></div>
        <div className="absolute -top-20 -right-24 w-[520px] h-[520px] rounded-full bg-[#DDE0E2] opacity-45 blur-2xl"></div>
      </div>

      <div className="relative h-full px-20 pt-44">
        <div className="text-[30px] leading-[36px] text-[#3f3f3f] font-[500] overflow-hidden">
          {slideData?.kicker || "Концепция кейтеринга"}
        </div>

        <div className="mt-6 text-[64px] leading-[68px] tracking-[0.5px] text-[#3f3f3f] font-[800] uppercase overflow-hidden">
          {slideData?.title || "НАИМЕНОВАНИЕ МЕРОПРИЯТИЯ"}
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

