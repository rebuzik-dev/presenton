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
    .default("Proposal image")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "proposals-three-images-slide"
const layoutName = "Proposals Three Images Slide"
const layoutDescription = "A slide with a header, a tag row, and three images in columns with labels."

const LabeledImageSchema = z.object({
  label: z.string().min(2).max(20).default("Брошь").meta({ description: "Image label. Max 2 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Product photo",
  }).meta({ description: "Image content. Max 30 words" }),
})

const Schema = z.object({
  titlePrefix: z.string().min(10).max(30).default("ПРЕДЛОЖЕНИЯ ПО").meta({ description: "Header prefix. Max 2 words" }),
  blockName: z.string().min(3).max(20).default("НАЗВАНИЕ БЛОКА").meta({ description: "Block name. Max 2 words" }),
  tags: z
    .array(z.string().min(2).max(22).meta({ description: "Tag text. Max 2 words" }))
    .min(3)
    .max(4)
    .default(["Брошь", "Блокнот", "Набор косметики", "Ручка и карандаш"])
    .meta({ description: "Tag row items. Max 4 items" }),
  images: z
    .array(LabeledImageSchema)
    .min(3)
    .max(3)
    .default([
      { label: "Брошь", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Brooch photo" } },
      { label: "Набор косметики", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Cosmetic set photo" } },
      { label: "Ручка и карандаш", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Pen and pencil photo" } },
    ])
    .meta({ description: "Three images. Max 3 items" }),
})

type ProposalsThreeImagesSlideData = z.infer<typeof Schema>

interface ProposalsThreeImagesSlideLayoutProps {
  data?: Partial<ProposalsThreeImagesSlideData>
}

const dynamicSlideLayout: React.FC<ProposalsThreeImagesSlideLayoutProps> = ({ data: slideData }) => {
  const imgs = slideData?.images || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="text-[46px] leading-[52px] font-[900] uppercase text-[#3f3f3f] overflow-hidden">
          {slideData?.titlePrefix || "ПРЕДЛОЖЕНИЯ ПО"} {slideData?.blockName || "НАЗВАНИЕ БЛОКА"}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-8 h-[490px]">
          {imgs.slice(0, 3).map((it, idx) => (
            <div key={idx} className="relative overflow-hidden bg-[#E6E6E6]">
              <img
                src={it.image.__image_url__}
                alt={it.image.__image_prompt__ || it.label}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 text-white text-[16px] leading-[18px] font-[500] drop-shadow overflow-hidden">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

