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
    .default("Moodboard photo")
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

const layoutId = "header-moodboard-collage-slide"
const layoutName = "Header Moodboard Collage Slide"
const layoutDescription = "A slide with a header and an image collage with a tall middle column and two stacked images."

const Schema = z.object({
  title: z
    .string()
    .min(3)
    .max(20)
    .default("МУДБОРД")
    .meta({ description: "Main header. Max 1 word" }),
  images: z
    .array(ImageSchema)
    .min(4)
    .max(4)
    .default([
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Moodboard image 1" },
      { __image_url__: "https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg", __image_prompt__: "Moodboard image 2" },
      { __image_url__: "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg", __image_prompt__: "Moodboard image 3" },
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Moodboard image 4" },
    ])
    .meta({ description: "Collage images. Max 4 items" }),
})

type HeaderMoodboardCollageSlideData = z.infer<typeof Schema>

interface HeaderMoodboardCollageSlideLayoutProps {
  data?: Partial<HeaderMoodboardCollageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderMoodboardCollageSlideLayoutProps> = ({ data: slideData }) => {
  const imgs = slideData?.images || []
  const i0 = imgs[0]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
  const i1 = imgs[1]?.__image_url__ || "https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg"
  const i2 = imgs[2]?.__image_url__ || "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg"
  const i3 = imgs[3]?.__image_url__ || "https://images.pexels.com/photos/2693212/pexels-photo-2693212.jpeg"

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden font-['Inter']">
      <div className="h-full px-[72px] pt-12 pb-12">
        <div className="text-[52px] leading-[58px] font-[900] uppercase text-[#3f3f3f]">
          {slideData?.title || "МУДБОРД"}
        </div>

        <div className="mt-6 grid grid-cols-[1.15fr_0.7fr_1.15fr] gap-7 h-[492px]">
          <div className="overflow-hidden bg-[#E6E6E6] h-full">
            <img src={i0} alt={imgs[0]?.__image_prompt__ || "moodboard 1"} className="w-full h-full object-cover" />
          </div>

          <div className="overflow-hidden bg-[#E6E6E6] h-full">
            <img src={i1} alt={imgs[1]?.__image_prompt__ || "moodboard 2"} className="w-full h-full object-cover" />
          </div>

          <div className="grid grid-rows-2 gap-7 h-full">
            <div className="overflow-hidden bg-[#E6E6E6]">
              <img src={i2} alt={imgs[2]?.__image_prompt__ || "moodboard 3"} className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden bg-[#E6E6E6]">
              <img src={i3} alt={imgs[3]?.__image_prompt__ || "moodboard 4"} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

