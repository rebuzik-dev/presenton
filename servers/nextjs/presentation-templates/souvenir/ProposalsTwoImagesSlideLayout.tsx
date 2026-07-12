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
    .default("Конкретное сувенирное предложение на основе брифа")
    .meta({ description: "Предмет, набор или упаковка из предложения; без случайного текста, логотипов и неподтверждённых характеристик." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "URL to icon. Max 10 words" }),
  __icon_prompt__: z.string().min(1).max(60).default("generic icon").meta({ description: "Prompt for icon. Max 6 words" }),
})

const layoutId = "proposals-two-images-slide"
const layoutName = "Proposals Two Images Slide"
const layoutDescription =
  "Два согласованных предложения для сувенирной линейки: конкретные позиции из брифа либо уместные творческие варианты для аудитории и повода."

const LabeledImageSchema = z.object({
  label: z.string().min(2).max(20).default("Основной предмет").meta({ description: "Короткое название позиции или роли кадра. До 2 слов." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Сувенирное изделие или упаковка, связанная с подписью и требованиями брифа",
  }).meta({ description: "Изображение конкретной позиции; второй кадр должен показывать другое изделие или функцию." }),
})

const Schema = z.object({
  titlePrefix: z.string().min(10).max(30).default("ПРЕДЛОЖЕНИЯ ПО").meta({ description: "Первая часть заголовка раздела с вариантами." }),
  blockName: z.string().min(3).max(20).default("ЛИНЕЙКЕ").meta({ description: "Короткое название категории или набора из брифа." }),
  tags: z
    .array(z.string().min(2).max(20).meta({ description: "Название одной позиции или роли в комплекте." }))
    .min(2)
    .max(2)
    .default(["Основной предмет", "Упаковка"])
    .meta({ description: "Две разные позиции из брифа или два уместных предложения, согласованных между собой." }),
  images: z
    .array(LabeledImageSchema)
    .min(2)
    .max(2)
    .default([
      { label: "Основной предмет", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Основное сувенирное изделие для аудитории и задачи из брифа, предметная съёмка" } },
      { label: "Упаковка", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Упаковка или комплектование того же сувенирного предложения в согласованной визуальной системе" } },
    ])
    .meta({ description: "Ровно два различных, но согласованных предложения или компонента набора." }),
})

type ProposalsTwoImagesSlideData = z.infer<typeof Schema>

interface ProposalsTwoImagesSlideLayoutProps {
  data?: Partial<ProposalsTwoImagesSlideData>
}

const dynamicSlideLayout: React.FC<ProposalsTwoImagesSlideLayoutProps> = ({ data: slideData }) => {
  const tags = slideData?.tags || []
  const imgs = slideData?.images || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const tagColor = resolveColor(slideData, "tag", "color", titleColor, "text_primary")
  const tagFont = resolveFontFamily(slideData, "tag", rootFont, "body")
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
            {slideData?.blockName || "ЛИНЕЙКЕ"}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-10 text-[18px] leading-[22px] text-[var(--style-text-primary)]/70" style={{ color: tagColor, fontFamily: tagFont }}>
          {tags.slice(0, 2).map((t, idx) => (
            <div
              key={idx}
              {...promptTargetAttrs({
                path: `tags[${idx}]`,
                type: "field",
                name: `Tag ${idx + 1}`,
                description: "Tag row item",
              })}
              className="overflow-hidden"
            >
              {t}
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8 h-[490px]">
          {imgs.slice(0, 2).map((it, idx) => (
            <div key={idx} className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: `images[${idx}].image.__image_prompt__`,
                  type: "image",
                  name: `Изображение предложения ${idx + 1}`,
                  description: "Отдельная позиция или компонент сувенирной линейки",
                })}
                src={it.image.__image_url__}
                alt={it.image.__image_prompt__ || it.label}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 text-white text-[16px] leading-[18px] font-[500] drop-shadow overflow-hidden" style={{ color: labelColor, fontFamily: labelFont }}>
                <span
                  {...promptTargetAttrs({
                    path: `images[${idx}].label`,
                    type: "field",
                    name: `Image label ${idx + 1}`,
                    description: "Короткое название позиции или роли кадра",
                  })}
                >
                  {it.label}
                </span>
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



