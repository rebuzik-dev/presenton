import React from 'react'
import * as z from 'zod'

const ImageSchema = z.object({
  __image_url__: z.string().url().meta({ description: "URL to image. Max 10 words" }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Supporting image")
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

const layoutId = "header-quote-two-columns-slide"
const layoutName = "Header Quote Two Columns Slide"
const layoutDescription = "A slide with a header, a quote card, and two text columns with a bullet list."

const Schema = z.object({
  title: z
    .string()
    .min(5)
    .max(45)
    .default("КОНЦЕПЦИЯ КЕЙТЕРИНГА")
    .meta({ description: "Main header. Max 2 words" }),
  quote: z
    .string()
    .min(20)
    .max(160)
    .default("Кейтеринг рассматривается как часть сценария пребывания гостя, а не как отдельная сервисная зона.")
    .meta({ description: "Quote card text. Max 22 words" }),
  leftColumnTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Ключевые смыслы")
    .meta({ description: "Left column header. Max 2 words" }),
  leftStrongLine: z
    .string()
    .min(10)
    .max(80)
    .default("Поддержка делового ритма и концентрации,")
    .meta({ description: "Left emphasized line. Max 7 words" }),
  leftWeakLine: z
    .string()
    .min(3)
    .max(60)
    .default("без отвлечения от содержательной части программы.")
    .meta({ description: "Left supporting line. Max 8 words" }),
  leftBody: z
    .string()
    .min(25)
    .max(220)
    .default(
      "Еда работает как фоновый, но структурирующий элемент: помогает переключаться между блоками, фиксировать паузы и выстраивать неформальное общение."
    )
    .meta({ description: "Left paragraph text. Max 28 words" }),
  rightColumnTitle: z
    .string()
    .min(3)
    .max(30)
    .default("Ключевая идея")
    .meta({ description: "Right column header. Max 2 words" }),
  rightBody: z
    .string()
    .min(12)
    .max(160)
    .default("Концепция соответствует формату делового форума с участием управленческой и экспертной аудитории:")
    .meta({ description: "Right paragraph text. Max 20 words" }),
  rightBullets: z
    .array(
      z
        .string()
        .min(6)
        .max(80)
        .meta({ description: "Bullet text. Max 10 words" })
    )
    .min(1)
    .max(3)
    .default(["отсутствие демонстративной гастрономии;", "акцент на удобство, ясность, нейтральность."])
    .meta({ description: "Bullet list items. Max 3 items" }),
})

type HeaderQuoteTwoColumnsSlideData = z.infer<typeof Schema>

interface HeaderQuoteTwoColumnsSlideLayoutProps {
  data?: Partial<HeaderQuoteTwoColumnsSlideData>
}

const dynamicSlideLayout: React.FC<HeaderQuoteTwoColumnsSlideLayoutProps> = ({ data: slideData }) => {
  const bullets = slideData?.rightBullets || []

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden font-['Inter']">
      <div className="h-full px-[72px] pt-10 pb-10 flex flex-col">
        <div className="text-[48px] leading-[54px] font-[800] uppercase text-[#3f3f3f]">
          {slideData?.title || "КОНЦЕПЦИЯ КЕЙТЕРИНГА"}
        </div>

        <div className="mt-7 rounded-[22px] bg-[#D8D6D3] shadow-[0_10px_18px_rgba(0,0,0,0.12)] px-12 py-8 flex gap-8 items-start">
          <div className="text-[54px] leading-[54px] font-[800] text-[#3f3f3f] -mt-1 flex-shrink-0">
            &laquo;
          </div>
          <div className="text-[30px] leading-[36px] font-[700] text-[#3f3f3f]">
            {slideData?.quote ||
              "Кейтеринг рассматривается как часть сценария пребывания гостя, а не как отдельная сервисная зона."}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-12 flex-1 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="text-[29px] leading-[34px] font-[800] text-[#3f3f3f]">
              {slideData?.leftColumnTitle || "Ключевые смыслы"}
            </div>
            <div className="mt-4 h-[2px] w-full bg-[#3f3f3f]"></div>

            <div className="mt-6 text-[27px] leading-[33px] text-[#3f3f3f] space-y-1">
              <div className="font-[800]">{slideData?.leftStrongLine || "Поддержка делового ритма и концентрации,"}</div>
              <div className="font-[500]">{slideData?.leftWeakLine || "без отвлечения от содержательной части программы."}</div>
            </div>

            <div className="mt-6 text-[24px] leading-[31px] text-[#3f3f3f] font-[500] max-w-[520px]">
              {slideData?.leftBody ||
                "Еда работает как фоновый, но структурирующий элемент: помогает переключаться между блоками, фиксировать паузы и выстраивать неформальное общение."}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="text-[29px] leading-[34px] font-[800] text-[#3f3f3f]">
              {slideData?.rightColumnTitle || "Ключевая идея"}
            </div>
            <div className="mt-4 h-[2px] w-full bg-[#3f3f3f]"></div>

            <div className="mt-6 text-[24px] leading-[31px] text-[#3f3f3f] font-[500] max-w-[560px]">
              {slideData?.rightBody ||
                "Концепция соответствует формату делового форума с участием управленческой и экспертной аудитории:"}
            </div>

            <ul className="mt-5 space-y-3 text-[24px] leading-[31px] text-[#3f3f3f] font-[500] min-h-0">
              {bullets.map((t, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="mt-[14px] w-2.5 h-1 bg-[#3f3f3f] flex-shrink-0"></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout

