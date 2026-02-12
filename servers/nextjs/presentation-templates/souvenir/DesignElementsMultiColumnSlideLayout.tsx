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
    .default("Design element photo")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "design-elements-multi-column-slide"
const layoutName = "Design Elements Multi Column Slide"
const layoutDescription = "A slide with a header, swatches, small icons, two images, and text blocks."

const SwatchSchema = z.object({
  hex: z.string().min(4).max(9).default("#C2BAC2").meta({ description: "Hex code. Max 1 word" }),
})

const Schema = z.object({
  title: z.string().min(3).max(40).default("ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА").meta({ description: "Header. Max 3 words" }),
  leftSwatches: z
    .array(SwatchSchema)
    .min(3)
    .max(3)
    .default([{ hex: "#C2BAC2" }, { hex: "#DEDDDD" }, { hex: "#81919E" }])
    .meta({ description: "Left swatches. Max 3 items" }),
  leftImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Small design photo",
  }).meta({ description: "Left small image. Max 30 words" }),
  topRightImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Top right image",
  }).meta({ description: "Top right image. Max 30 words" }),
  mainImage: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Main image",
  }).meta({ description: "Main image. Max 30 words" }),
  cornerSwatch: SwatchSchema.default({ hex: "#1A1C23" }).meta({ description: "Corner swatch. Max 1 item" }),
  topText: z
    .string()
    .min(20)
    .max(180)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Top text block. Max 24 words" }),
  bottomText: z
    .string()
    .min(20)
    .max(180)
    .default("Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов")
    .meta({ description: "Bottom text block. Max 24 words" }),
  icons: z
    .array(IconSchema)
    .min(4)
    .max(6)
    .default([
      { __icon_url__: "", __icon_prompt__: "calendar icon" },
      { __icon_url__: "", __icon_prompt__: "chat icon" },
      { __icon_url__: "", __icon_prompt__: "location icon" },
      { __icon_url__: "", __icon_prompt__: "pin icon" },
    ])
    .meta({ description: "Small generic icons. Max 6 items" }),
})

type DesignElementsMultiColumnSlideData = z.infer<typeof Schema>

interface DesignElementsMultiColumnSlideLayoutProps {
  data?: Partial<DesignElementsMultiColumnSlideData>
}

const dynamicSlideLayout: React.FC<DesignElementsMultiColumnSlideLayoutProps> = ({ data: slideData }) => {
  const swatches = slideData?.leftSwatches || []
  const icons = slideData?.icons || []

  const Swatch: React.FC<{ hex: string; size?: string }> = ({ hex, size }) => (
    <div className={size || "w-[118px] h-[50px] rounded-[10px]"} style={{ backgroundColor: hex }}></div>
  )

  const GenericIcon: React.FC<{ label: string }> = ({ label }) => (
    <div className="w-[34px] h-[34px] rounded-full border border-[#3f3f3f]/35 flex items-center justify-center text-[#3f3f3f]/75 bg-white/70">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {label.toLowerCase().includes("calendar") && (
          <>
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <line x1="16" y1="3" x2="16" y2="7"></line>
            <line x1="8" y1="3" x2="8" y2="7"></line>
            <line x1="3" y1="11" x2="21" y2="11"></line>
          </>
        )}
        {label.toLowerCase().includes("chat") && (
          <>
            <path d="M4 5h16v10H8l-4 4V5z"></path>
          </>
        )}
        {(label.toLowerCase().includes("location") || label.toLowerCase().includes("pin")) && (
          <>
            <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"></path>
            <circle cx="12" cy="11" r="2.5"></circle>
          </>
        )}
        {!label.toLowerCase().includes("calendar") &&
          !label.toLowerCase().includes("chat") &&
          !label.toLowerCase().includes("location") &&
          !label.toLowerCase().includes("pin") && (
            <>
              <circle cx="12" cy="12" r="8"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </>
          )}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  )

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-[#F3F3F1] z-20 mx-auto overflow-hidden" style={{ fontFamily: "Inter, Arial, sans-serif" }}>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 52%), repeating-linear-gradient(0deg, rgba(0,0,0,0.02), rgba(0,0,0,0.02) 1px, transparent 1px, transparent 4px)",
        }}
      />
      <div className="relative h-full px-[64px] pt-9 pb-12">
        <div className="text-[42px] leading-[48px] font-[800] uppercase text-[#3f3f3f]">
          {slideData?.title || "ОСНОВНЫЕ ЭЛЕМЕНТЫ ДИЗАЙНА"}
        </div>

        <div className="mt-5 grid grid-cols-[230px_180px_1fr] gap-8 h-[490px]">
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              {swatches.slice(0, 3).map((s, idx) => (
                <Swatch key={idx} hex={s.hex} />
              ))}
            </div>

            <div className="w-[220px] h-[150px] overflow-hidden rounded-[10px] bg-[#E6E6E6]">
              <img
                src={slideData?.leftImage?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
                alt={slideData?.leftImage?.__image_prompt__ || "left image"}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-end gap-3 pt-2">
              <div className="w-5 h-[54px] rounded-[10px] bg-[#8A98A2]/65"></div>
              <div className="w-5 h-[76px] rounded-[10px] bg-[#8A98A2]/78"></div>
              <div className="w-5 h-[42px] rounded-[10px] bg-[#8A98A2]/52"></div>
              <div className="w-5 h-[63px] rounded-[10px] bg-[#8A98A2]/68"></div>
            </div>
          </div>

          <div className="flex flex-col justify-between py-1">
            <div className="h-[132px] rounded-[18px] bg-[#9AA6AE]/25 border border-[#9AA6AE]/35 relative overflow-hidden">
              <div className="absolute -left-10 top-[18px] w-[200px] h-[200px] rounded-full border-[20px] border-[#6D7E89]/50"></div>
              <div className="absolute left-6 top-5 text-[14px] leading-[18px] text-[#3f3f3f]/65">arc block</div>
            </div>

            <div className="h-[132px] rounded-[16px] bg-white/70 border border-[#9AA6AE]/30 p-4">
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#9AA6AE]/70"></div>
                ))}
              </div>
            </div>

            <div className="h-[132px] rounded-[16px] bg-white/80 border border-[#9AA6AE]/35 p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {icons.slice(0, 4).map((ic, idx) => (
                <GenericIcon key={idx} label={ic.__icon_prompt__} />
              ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.2fr_0.8fr] gap-7">
            <div className="relative h-full overflow-hidden rounded-[10px] bg-[#E6E6E6]">
                <img
                  src={slideData?.mainImage?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
                  alt={slideData?.mainImage?.__image_prompt__ || "main image"}
                  className="w-full h-full object-cover"
                />
              <div className="absolute bottom-0 right-0 w-[86px] h-[86px] bg-[#1A1C23] rounded-tl-[28px]"></div>
              <div className="absolute bottom-4 right-4">
                <Swatch hex={slideData?.cornerSwatch?.hex || "#1A1C23"} size="w-[50px] h-[50px] rounded-[12px]" />
              </div>
            </div>

            <div className="flex flex-col justify-start gap-7 pt-1">
              <div className="text-[16px] leading-[22px] text-[#3f3f3f]/70">
                {slideData?.topText ||
                  "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
              </div>
              <div className="text-[16px] leading-[22px] text-[#3f3f3f]/70">
                {slideData?.bottomText ||
                  "Описание основных элементов Описание основных элементов Описание основных элементов Описание основных элементов"}
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

