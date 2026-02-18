import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'

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
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const kickerFont = resolveFontFamily(slideData, "kicker", rootFont, "body")
  const blobOne = resolveColor(slideData, "bg_blob_1", "background", "#EAEAEA", "surface")
  const blobTwo = resolveColor(slideData, "bg_blob_2", "background", "#D8D6D3", "surface")
  const blobThree = resolveColor(slideData, "bg_blob_3", "background", "#DDE0E2", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-40 w-[720px] h-[520px] rounded-full opacity-60 blur-2xl" style={{ backgroundColor: blobOne }}></div>
        <div className="absolute -bottom-40 -right-48 w-[880px] h-[640px] rounded-full opacity-55 blur-2xl" style={{ backgroundColor: blobTwo }}></div>
        <div className="absolute -top-20 -right-24 w-[520px] h-[520px] rounded-full opacity-45 blur-2xl" style={{ backgroundColor: blobThree }}></div>
      </div>

      <div className="relative h-full px-20 pt-44">
        <div className="text-[24px] leading-[32px] text-[var(--style-text-primary)] font-[500] overflow-hidden" style={{ color: titleColor, fontFamily: kickerFont }}>
          {slideData?.kicker || "Концепция кейтеринга"}
        </div>

        <div className="mt-6 text-[64px] leading-[68px] tracking-[0.5px] text-[var(--style-text-primary)] font-[800] uppercase overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
          {slideData?.title || "НАИМЕНОВАНИЕ МЕРОПРИЯТИЯ"}
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



