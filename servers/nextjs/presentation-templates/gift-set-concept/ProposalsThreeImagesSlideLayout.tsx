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
    description: "Служебный URL изображения.",
  }),
  __image_prompt__: z
    .string()
    .min(3)
    .max(180)
    .default("Конкретный компонент подарочного набора на основе брифа")
    .meta({ description: "Отдельный компонент набора или упаковка; каждый слот описывает другой предмет или функцию." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z.string().min(1).max(60).default("нейтральная иконка").meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "proposals-three-images-slide"
const layoutName = "Proposals Three Images Slide"
const layoutDescription =
  "Три взаимосвязанных компонента подарочного набора: позиции из брифа либо уместные предложения для получателя, назначения и способа вручения."

const LabeledImageSchema = z.object({
  label: z.string().min(2).max(20).default("Основной предмет").meta({ description: "Короткое название позиции или роли кадра. До 2 слов." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Компонент подарочного набора, связанный с подписью и требованиями брифа",
  }).meta({ description: "Изображение конкретной позиции; не повторять предмет и композицию соседних карточек." }),
})

const Schema = z.object({
  titlePrefix: z.string().min(10).max(30).default("ПРЕДЛОЖЕНИЯ ПО").meta({ description: "Короткая строка перед названием категории. До 2 слов." }),
  blockName: z.string().min(3).max(20).default("ЛИНЕЙКЕ").meta({ description: "Короткое название категории или набора из брифа." }),
  tags: z
    .array(z.string().min(2).max(22).meta({ description: "Короткая характеристика предложения. До 2 слов." }))
    .min(3)
    .max(4)
    .default(["Основной предмет", "Дополнение", "Упаковка"])
    .meta({ description: "Названия позиций из брифа или трёх согласованных творческих предложений." }),
  images: z
    .array(LabeledImageSchema)
    .min(3)
    .max(3)
    .default([
      { label: "Основной компонент", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Основной компонент подарочного набора для получателя и задачи из брифа, предметная съёмка" } },
      { label: "Дополнение", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Дополняющий компонент того же набора с другой функцией и отличимым ракурсом" } },
      { label: "Упаковка", image: { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Упаковка и комплектование подарочного набора в общей визуальной системе" } },
    ])
    .meta({ description: "Ровно три разные позиции или компонента набора, объединённые одной концепцией." }),
})

type ProposalsThreeImagesSlideData = z.infer<typeof Schema>

interface ProposalsThreeImagesSlideLayoutProps {
  data?: Partial<ProposalsThreeImagesSlideData>
}

const dynamicSlideLayout: React.FC<ProposalsThreeImagesSlideLayoutProps> = ({ data: slideData }) => {
  const imgs = slideData?.images || []
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
              description: "Короткая строка перед названием категории",
            })}
          >
            {slideData?.titlePrefix || "ПРЕДЛОЖЕНИЯ ПО"}
          </span>{" "}
          <span
            {...promptTargetAttrs({
              path: "blockName",
              type: "field",
              name: "Block name",
              description: "Название категории предложений",
            })}
          >
            {slideData?.blockName || "ЛИНЕЙКЕ"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-8 h-[490px]">
          {imgs.slice(0, 3).map((it, idx) => (
            <div key={idx} className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: `images[${idx}].image.__image_prompt__`,
                  type: "image",
                  name: `Изображение предложения ${idx + 1}`,
                  description: "Отдельный компонент подарочного набора",
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



