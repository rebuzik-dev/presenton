import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'
import { promptTargetAttrs } from '@/app/(presentation-generator)/components/PromptTarget'

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
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const bodyColor = resolveColor(slideData, "body", "color", titleColor, "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const leftTitleFont = resolveFontFamily(slideData, "left_typography", rootFont, "heading")
  const rightTitleFont = resolveFontFamily(slideData, "right_typography", rootFont, "heading")
  const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body")
  const accentColor = resolveColor(slideData, "bullet_marker", "background", "#3f3f3f", "accent")
  const cardBackground = resolveColor(slideData, "content_card", "background", "rgba(255,255,255,0.6)", "surface")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="flex items-start justify-between">
          <div className="text-[48px] leading-[54px] font-[900] uppercase text-[var(--style-text-primary)] overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
            <span
              {...promptTargetAttrs({
                path: "title",
                type: "field",
                name: "Title",
                description: "Typography slide header",
              })}
            >
              {slideData?.title || "ТИПОГРАФИКА"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-10 items-stretch h-[490px]">
          <div className="bg-white/60 rounded-[10px] p-8 shadow-[0_6px_14px_rgba(0,0,0,0.08)]" style={{ backgroundColor: cardBackground }}>
            <div className="grid grid-cols-2 gap-10 h-full">
              <div className="min-h-0">
                <div className="text-[28px] leading-[32px] font-[800] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: leftTitleFont }}>
                  <span
                    {...promptTargetAttrs({
                      path: "leftTitle",
                      type: "field",
                      name: "Left title",
                      description: "Left typography title",
                    })}
                  >
                    {slideData?.leftTitle || "Inter Bold"}
                  </span>
                </div>
                <ul className="mt-6 space-y-3 text-[18px] leading-[22px] text-[var(--style-text-primary)]/80" style={{ color: bodyColor, fontFamily: bodyFont }}>
                  {bullets.map((t, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="mt-[9px] w-2 h-2 rounded-full bg-[var(--style-accent)]/60 flex-shrink-0" style={{ backgroundColor: accentColor }}></span>
                      <span
                        {...promptTargetAttrs({
                          path: `leftBullets[${idx}]`,
                          type: "field",
                          name: `Bullet ${idx + 1}`,
                          description: "Left typography bullet",
                        })}
                        className="overflow-hidden"
                      >
                        {t}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 text-[26px] leading-[30px] font-[800] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: leftTitleFont }}>
                  <span
                    {...promptTargetAttrs({
                      path: "leftSample",
                      type: "field",
                      name: "Left sample",
                      description: "Left sample text",
                    })}
                  >
                    {slideData?.leftSample || "Aa Bb Cc 123"}
                  </span>
                </div>
                <div className="mt-8 text-[14px] leading-[20px] text-[var(--style-text-primary)]/60" style={{ color: bodyColor, fontFamily: bodyFont }}>AbCbZzAa · Aa Bb Cc 123</div>
              </div>

              <div className="min-h-0">
                <div className="text-[28px] leading-[32px] font-[500] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: rightTitleFont }}>
                  <span
                    {...promptTargetAttrs({
                      path: "rightTitle",
                      type: "field",
                      name: "Right title",
                      description: "Right typography title",
                    })}
                  >
                    {slideData?.rightTitle || "Inter Regular"}
                  </span>
                </div>
                <div className="mt-6 text-[16px] leading-[22px] text-[var(--style-text-primary)]/75 overflow-hidden" style={{ color: bodyColor, fontFamily: bodyFont }}>
                  <span
                    {...promptTargetAttrs({
                      path: "rightBody",
                      type: "field",
                      name: "Right body",
                      description: "Right paragraph",
                    })}
                  >
                    {slideData?.rightBody ||
                      "Основное повествование. Нейтральный текст, пригодный как для презентаций, так и для лендингов."}
                  </span>
                </div>
                <div className="mt-10 text-[18px] leading-[22px] font-[500] text-[var(--style-text-primary)] overflow-hidden" style={{ color: bodyColor, fontFamily: bodyFont }}>
                  <span
                    {...promptTargetAttrs({
                      path: "rightSample",
                      type: "field",
                      name: "Right sample",
                      description: "Right sample text",
                    })}
                  >
                    {slideData?.rightSample || "Aa Bb Cc 123 AbCbZzAa"}
                  </span>
                </div>
                <div className="mt-8 text-[14px] leading-[20px] text-[var(--style-text-primary)]/60" style={{ color: bodyColor, fontFamily: bodyFont }}>AbCbZzAa · Aa Bb Cc 123</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[8px] bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
            <img
              {...promptTargetAttrs({
                path: "image.__image_prompt__",
                type: "image",
                name: "Typography image prompt",
                description: "Supporting image prompt",
              })}
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



