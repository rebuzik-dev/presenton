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
    .default("Overview photo")
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

const layoutId = "header-image-facts-list-slide"
const layoutName = "Header Image Facts List Slide"
const layoutDescription = "A slide with a header, a large image, a facts column, and a bullet list."

const FactSchema = z.object({
  label: z.string().min(3).max(40).default("Параметр").meta({ description: "Fact label. Max 3 words" }),
  value: z.string().min(1).max(30).default("Значение").meta({ description: "Fact value. Max 3 words" }),
})

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(30)
    .default("ОБЩАЯ ИНФОРМАЦИЯ")
    .meta({ description: "Main header. Max 2 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Catering photo",
  }).meta({ description: "Main image. Max 30 words" }),
  facts: z
    .array(FactSchema)
    .min(2)
    .max(5)
    .default([
      { label: "Количество человек", value: "200 человек" },
      { label: "Выход еды на человека", value: "700 гр./человек" },
      { label: "Выход напитков на человека", value: "400 гр./человек" },
    ])
    .meta({ description: "Facts list. Max 5 items" }),
  listTitle: z
    .string()
    .min(3)
    .max(20)
    .default("Ассортимент")
    .meta({ description: "List header. Max 1 word" }),
  listItems: z
    .array(z.string().min(4).max(40).meta({ description: "List item text. Max 4 words" }))
    .min(2)
    .max(6)
    .default(["Горячие – 2 вида", "Салаты – 3 вида", "Закуски – 3 вида", "Десерты – 2 вида"])
    .meta({ description: "Bullet list items. Max 6 items" }),
})

type HeaderImageFactsListSlideData = z.infer<typeof Schema>

interface HeaderImageFactsListSlideLayoutProps {
  data?: Partial<HeaderImageFactsListSlideData>
}

const dynamicSlideLayout: React.FC<HeaderImageFactsListSlideLayoutProps> = ({ data: slideData }) => {
  const facts = slideData?.facts || []
  const listItems = slideData?.listItems || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-[72px] pt-12 pb-12">
        <div className="text-[52px] leading-[58px] font-[900] uppercase text-[#3f3f3f]">
          {slideData?.title || "ОБЩАЯ ИНФОРМАЦИЯ"}
        </div>

        <div className="mt-8 grid grid-cols-[1.45fr_0.85fr] gap-10 items-start">
          <div className="w-full h-[472px] overflow-hidden bg-[#E6E6E6]">
            <img
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || slideData?.title || ""}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="pt-2">
            <div className="space-y-6">
              {facts.map((f, idx) => (
                <div key={idx}>
                  <div className="text-[24px] leading-[32px] font-[800] text-[#3f3f3f]">{f.label}</div>
                  <div className="mt-2 text-[24px] leading-[32px] font-[500] text-[#3f3f3f]">{f.value}</div>
                </div>
              ))}

              <div>
                <div className="text-[24px] leading-[32px] font-[800] text-[#3f3f3f]">
                  {slideData?.listTitle || "Ассортимент"}
                </div>
                <ul className="mt-3 space-y-2 text-[24px] leading-[32px] font-[500] text-[#3f3f3f]">
                  {listItems.map((t, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <span className="mt-[12px] w-2.5 h-1 bg-[#3f3f3f] flex-shrink-0"></span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
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


