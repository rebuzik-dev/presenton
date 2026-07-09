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
    .default("Proposal image")
    .meta({ description: "Prompt used to generate the image. Max 30 words" }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "proposals-collage-left-right-stack-slide"
const layoutName = "Proposals Collage Left Right Stack Slide"
const layoutDescription =
  "A slide with a header, a tag row, and a collage with a large left image and two stacked right images."

const LabeledImageSchema = z.object({
  label: z.string().min(2).max(22).default("Брошь").meta({ description: "Image label. Max 2 words" }),
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
    .min(2)
    .max(3)
    .default(["Брошь", "Набор косметики", "Пригласительное"])
    .meta({ description: "Tag row items. Max 3 items" }),
  left: LabeledImageSchema.default({
    label: "Брошь",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Brooch close-up",
    },
  }).meta({ description: "Left large image. Max 30 words" }),
  rightTop: LabeledImageSchema.default({
    label: "Набор косметики",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Cosmetic set close-up",
    },
  }).meta({ description: "Right top image. Max 30 words" }),
  rightBottom: LabeledImageSchema.default({
    label: "Пригласительное",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Invitation close-up",
    },
  }).meta({ description: "Right bottom image. Max 30 words" }),
})

type ProposalsCollageLeftRightStackSlideData = z.infer<typeof Schema>

interface ProposalsCollageLeftRightStackSlideLayoutProps {
  data?: Partial<ProposalsCollageLeftRightStackSlideData>
}

const dynamicSlideLayout: React.FC<ProposalsCollageLeftRightStackSlideLayoutProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const labelColor = resolveColor(slideData, "image_label", "color", "#FFFFFF")
  const labelFont = resolveFontFamily(slideData, "image_label", rootFont, "body")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="text-[46px] leading-[52px] font-[900] uppercase text-[var(--style-text-primary)] overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
          <span
            {...promptTargetAttrs({
              path: "titlePrefix",
              type: "field",
              name: "Title prefix",
              description: "Header prefix",
            })}
          >
            {slideData?.titlePrefix || "ПРЕДЛОЖЕНИЯ ПО"}
          </span>{" "}
          <span
            {...promptTargetAttrs({
              path: "blockName",
              type: "field",
              name: "Block name",
              description: "Header block name",
            })}
          >
            {slideData?.blockName || "НАЗВАНИЕ БЛОКА"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[1.6fr_1fr] gap-8 h-[490px]">
          <div className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
            <img
              {...promptTargetAttrs({
                path: "left.image.__image_prompt__",
                type: "image",
                name: "Left image prompt",
                description: "Left collage image prompt",
              })}
              src={
                slideData?.left?.image?.__image_url__ ||
                "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
              }
              alt={slideData?.left?.image?.__image_prompt__ || slideData?.left?.label || "left image"}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-6 left-4 text-white text-[16px] leading-[18px] font-[500] drop-shadow overflow-hidden" style={{ color: labelColor, fontFamily: labelFont }}>
              <span
                {...promptTargetAttrs({
                  path: "left.label",
                  type: "field",
                  name: "Left label",
                  description: "Left collage label",
                })}
              >
                {slideData?.left?.label || "Брошь"}
              </span>
            </div>
          </div>

          <div className="grid grid-rows-2 gap-8 h-full">
            <div className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: "rightTop.image.__image_prompt__",
                  type: "image",
                  name: "Right top image prompt",
                  description: "Right top collage image prompt",
                })}
                src={
                  slideData?.rightTop?.image?.__image_url__ ||
                  "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
                }
                alt={slideData?.rightTop?.image?.__image_prompt__ || slideData?.rightTop?.label || "right top"}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-4 text-white text-[16px] leading-[18px] font-[500] drop-shadow overflow-hidden" style={{ color: labelColor, fontFamily: labelFont }}>
                <span
                  {...promptTargetAttrs({
                    path: "rightTop.label",
                    type: "field",
                    name: "Right top label",
                    description: "Right top collage label",
                  })}
                >
                  {slideData?.rightTop?.label || "Набор косметики"}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: "rightBottom.image.__image_prompt__",
                  type: "image",
                  name: "Right bottom image prompt",
                  description: "Right bottom collage image prompt",
                })}
                src={
                  slideData?.rightBottom?.image?.__image_url__ ||
                  "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
                }
                alt={slideData?.rightBottom?.image?.__image_prompt__ || slideData?.rightBottom?.label || "right bottom"}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-4 text-white text-[16px] leading-[18px] font-[500] drop-shadow overflow-hidden" style={{ color: labelColor, fontFamily: labelFont }}>
                <span
                  {...promptTargetAttrs({
                    path: "rightBottom.label",
                    type: "field",
                    name: "Right bottom label",
                    description: "Right bottom collage label",
                  })}
                >
                  {slideData?.rightBottom?.label || "Пригласительное"}
                </span>
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



