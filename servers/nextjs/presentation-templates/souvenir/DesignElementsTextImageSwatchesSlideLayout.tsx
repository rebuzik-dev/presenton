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
    .default("Design element image")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "design-elements-text-image-swatches-slide"
const layoutName = "Design Elements Text Image Swatches Slide"
const layoutDescription = "A slide with a header, text blocks on the left, a large image on the right, and swatches below."

const SwatchSchema = z.object({
  hex: z.string().min(4).max(9).default("#DEDDDD").meta({ description: "Hex code. Max 1 word" }),
})

const Schema = z.object({
  title: z.string().min(3).max(40).default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА").meta({ description: "Header. Max 3 words" }),
  topText: z
    .string()
    .min(20)
    .max(170)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Top text block. Max 22 words" }),
  bottomText: z
    .string()
    .min(20)
    .max(170)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Bottom text block. Max 22 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Large design photo",
  }).meta({ description: "Main image. Max 30 words" }),
  swatches: z
    .array(SwatchSchema)
    .min(3)
    .max(3)
    .default([{ hex: "#DEDDDD" }, { hex: "#C2BAC2" }, { hex: "#81919E" }])
    .meta({ description: "Bottom swatches. Max 3 items" }),
})

type DesignElementsTextImageSwatchesSlideData = z.infer<typeof Schema>

interface DesignElementsTextImageSwatchesSlideLayoutProps {
  data?: Partial<DesignElementsTextImageSwatchesSlideData>
}

const dynamicSlideLayout: React.FC<DesignElementsTextImageSwatchesSlideLayoutProps> = ({ data: slideData }) => {
  const swatches = slideData?.swatches || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="text-[48px] leading-[54px] font-[900] uppercase text-[#3f3f3f] overflow-hidden">
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА"}
        </div>

        <div className="mt-6 grid grid-cols-[0.85fr_1.15fr] gap-10 h-[490px]">
          <div className="flex flex-col justify-between py-2">
            <div className="text-[16px] leading-[22px] text-[#3f3f3f]/70">
              {slideData?.topText ||
                "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
            </div>

            <div className="text-[16px] leading-[22px] text-[#3f3f3f]/70">
              {slideData?.bottomText ||
                "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex-1 overflow-hidden rounded-[10px] bg-[#E6E6E6]">
              <img
                src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
                alt={slideData?.image?.__image_prompt__ || "image"}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-end justify-start gap-6 h-[92px]">
              {swatches.slice(0, 3).map((s, idx) => (
                <div key={idx} className="w-[132px] h-[60px] rounded-[12px]" style={{ backgroundColor: s.hex }}></div>
              ))}

              <div className="ml-auto flex items-end gap-4">
                <div className="w-[16px] h-[90px] rounded-[12px] bg-[#81919E]/60"></div>
                <div className="w-[16px] h-[90px] rounded-[12px] bg-[#81919E]/45"></div>
                <div className="w-[16px] h-[90px] rounded-[12px] bg-[#81919E]/30"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

