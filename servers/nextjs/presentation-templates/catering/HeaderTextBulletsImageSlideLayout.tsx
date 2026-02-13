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
    .default("Menu photo")
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

const layoutId = "header-text-bullets-image-slide"
const layoutName = "Header Text Bullets Image Slide"
const layoutDescription = "A slide with a header, a text column with bullet points, and a large image."

const Schema = z.object({
  title: z
    .string()
    .min(10)
    .max(65)
    .default("ОСНОВНЫЕ ПРИНЦИПЫ ФОРМИРОВАНИЯ МЕНЮ")
    .meta({ description: "Main header. Max 4 words" }),
  lead: z
    .string()
    .min(10)
    .max(70)
    .default("Меню формируется по функциональной логике.")
    .meta({ description: "Lead text. Max 6 words" }),
  listTitle: z
    .string()
    .min(3)
    .max(20)
    .default("Принципы:")
    .meta({ description: "List header. Max 1 word" }),
  bullets: z
    .array(z.string().min(8).max(70).meta({ description: "Bullet text. Max 8 words" }))
    .min(2)
    .max(4)
    .default(["баланс лёгких и сытных позиций;", "адаптация под тайминг;", "универсальность для широкой аудитории."])
    .meta({ description: "Bullet list items. Max 4 items" }),
  footerNote: z
    .string()
    .min(6)
    .max(50)
    .default("Фокус — удобство и скорость потребления.")
    .meta({ description: "Footer note text. Max 6 words" }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Catering dish photo",
  }).meta({ description: "Supporting image. Max 30 words" }),
})

type HeaderTextBulletsImageSlideData = z.infer<typeof Schema>

interface HeaderTextBulletsImageSlideLayoutProps {
  data?: Partial<HeaderTextBulletsImageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderTextBulletsImageSlideLayoutProps> = ({ data: slideData }) => {
  const bullets = slideData?.bullets || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={{ fontFamily: "var(--template-font, Inter)" }}>
      <div className="h-full px-[72px] pt-12 pb-12">
        <div className="text-[50px] leading-[56px] font-[900] uppercase text-[#3f3f3f]">
          {slideData?.title || "ОСНОВНЫЕ ПРИНЦИПЫ ФОРМИРОВАНИЯ МЕНЮ"}
        </div>

        <div className="mt-8 grid grid-cols-[1fr_1.35fr] gap-10 items-start">
          <div className="pt-1">
            <div className="text-[24px] leading-[32px] font-[700] text-[#3f3f3f]">
              {(slideData?.lead || "Меню формируется по функциональной логике.").split(" ").slice(0, 3).join(" ")}
              <br />
              {(slideData?.lead || "Меню формируется по функциональной логике.").split(" ").slice(3).join(" ")}
            </div>

            <div className="mt-7 text-[24px] leading-[32px] font-[600] text-[#3f3f3f]">
              {slideData?.listTitle || "Принципы:"}
            </div>

            <ul className="mt-5 space-y-5 text-[24px] leading-[32px] font-[500] text-[#3f3f3f]">
              {bullets.map((t, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="mt-[14px] w-2.5 h-1 bg-[#3f3f3f] flex-shrink-0"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 text-[24px] leading-[32px] font-[500] text-[#3f3f3f] max-w-[420px]">
              {slideData?.footerNote || "Фокус — удобство и скорость потребления."}
            </div>
          </div>

          <div className="w-full h-[470px] overflow-hidden bg-[#E6E6E6]">
            <img
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || slideData?.title || ""}
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


