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
    .default("Typography supporting photo")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "typography-two-columns-image-slide"
const layoutName = "Typography Two Columns Image Slide"
const layoutDescription = "A slide with a header, typography blocks, and a supporting image."

const Schema = z.object({
  title: z.string().min(3).max(20).default("ТИПОГРАФИКА").meta({ description: "Header. Max 1 word" }),
  leftTitle: z.string().min(3).max(20).default("Inter Bold").meta({ description: "Left typography title. Max 2 words" }),
  leftBullets: z
    .array(z.string().min(3).max(28).meta({ description: "Bullet line. Max 3 words" }))
    .min(2)
    .max(4)
    .default(["Заголовки", "Короткие акценты", "Пункты перечней"])
    .meta({ description: "Left bullet list. Max 4 items" }),
  leftSample: z.string().min(3).max(20).default("Aa Bb Cc 123").meta({ description: "Left sample text. Max 4 words" }),
  rightTitle: z.string().min(3).max(20).default("Inter Regular").meta({ description: "Right typography title. Max 2 words" }),
  rightBody: z
    .string()
    .min(20)
    .max(200)
    .default("Основное повествование. Нейтральный текст, пригодный как для презентаций, так и для лендингов.")
    .meta({ description: "Right paragraph. Max 26 words" }),
  rightSample: z.string().min(3).max(30).default("Aa Bb Cc 123 AbCbZzAa").meta({ description: "Right sample text. Max 5 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Elegant table decor photo",
  }).meta({ description: "Right image. Max 30 words" }),
})

type TypographyTwoColumnsImageSlideData = z.infer<typeof Schema>

interface TypographyTwoColumnsImageSlideLayoutProps {
  data?: Partial<TypographyTwoColumnsImageSlideData>
}

const dynamicSlideLayout: React.FC<TypographyTwoColumnsImageSlideLayoutProps> = ({ data: slideData }) => {
  const bullets = slideData?.leftBullets || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="flex items-start justify-between">
          <div className="text-[48px] leading-[54px] font-[900] uppercase text-[#3f3f3f] overflow-hidden">{slideData?.title || "ТИПОГРАФИКА"}</div>
        </div>

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-10 items-stretch h-[490px]">
          <div className="bg-white/60 rounded-[10px] p-8 shadow-[0_6px_14px_rgba(0,0,0,0.08)]">
            <div className="grid grid-cols-2 gap-10 h-full">
              <div className="min-h-0">
                <div className="text-[28px] leading-[32px] font-[800] text-[#3f3f3f] overflow-hidden">{slideData?.leftTitle || "Inter Bold"}</div>
                <ul className="mt-6 space-y-3 text-[18px] leading-[22px] text-[#3f3f3f]/80">
                  {bullets.map((t, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="mt-[9px] w-2 h-2 rounded-full bg-[#3f3f3f]/60 flex-shrink-0"></span>
                      <span className="overflow-hidden">{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 text-[26px] leading-[30px] font-[800] text-[#3f3f3f] overflow-hidden">
                  {slideData?.leftSample || "Aa Bb Cc 123"}
                </div>
                <div className="mt-8 text-[14px] leading-[20px] text-[#3f3f3f]/60">AbCbZzAa · Aa Bb Cc 123</div>
              </div>

              <div className="min-h-0">
                <div className="text-[28px] leading-[32px] font-[500] text-[#3f3f3f] overflow-hidden">{slideData?.rightTitle || "Inter Regular"}</div>
                <div className="mt-6 text-[16px] leading-[22px] text-[#3f3f3f]/75 overflow-hidden">
                  {slideData?.rightBody ||
                    "Основное повествование. Нейтральный текст, пригодный как для презентаций, так и для лендингов."}
                </div>
                <div className="mt-10 text-[18px] leading-[22px] font-[500] text-[#3f3f3f] overflow-hidden">
                  {slideData?.rightSample || "Aa Bb Cc 123 AbCbZzAa"}
                </div>
                <div className="mt-8 text-[14px] leading-[20px] text-[#3f3f3f]/60">AbCbZzAa · Aa Bb Cc 123</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[8px] bg-[#E6E6E6]">
            <img
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || "typography image"}
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

