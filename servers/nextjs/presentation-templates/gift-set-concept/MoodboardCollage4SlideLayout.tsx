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
    .default("Кадр концепции подарочного набора на основе брифа")
    .meta({ description: "Один самостоятельный кадр moodboard подарочного набора; соседние слоты не должны повторяться." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z.string().min(1).max(60).default("нейтральная иконка").meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "moodboard-collage-4-slide"
const layoutName = "Moodboard Collage 4 Slide"
const layoutDescription =
  "Четырёхкадровый moodboard подарочного набора: общий вид, отдельный компонент, материалы и отделка, упаковка или вручение."

const Schema = z.object({
  title: z.string().min(3).max(20).default("МУДБОРД").meta({ description: "Короткий заголовок moodboard подарочного набора." }),
  images: z
    .array(ImageSchema)
    .min(4)
    .max(4)
    .default([
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Общий вид цельного подарочного набора для получателя и повода из брифа" },
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Крупный план одного компонента, его материала, фактуры или отделки" },
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Упаковка и комплектование подарочного набора в общей визуальной системе" },
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Естественный сценарий вручения или распаковки подарочного набора получателем" },
    ])
    .meta({ description: "Ровно четыре разных кадра; общая палитра и стиль приходят отдельно через image_style." }),
})

type MoodboardCollage4SlideData = z.infer<typeof Schema>

interface MoodboardCollage4SlideLayoutProps {
  data?: Partial<MoodboardCollage4SlideData>
}

const dynamicSlideLayout: React.FC<MoodboardCollage4SlideLayoutProps> = ({ data: slideData }) => {
  const imgs = slideData?.images || []
  const i0 = imgs[0]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
  const i1 = imgs[1]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
  const i2 = imgs[2]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
  const i3 = imgs[3]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-16 pt-10 pb-12">
        <div className="text-[48px] leading-[54px] font-[900] uppercase text-[var(--style-text-primary)] overflow-hidden" style={{ color: titleColor, fontFamily: titleFont }}>
          <span
            {...promptTargetAttrs({
              path: "title",
              type: "field",
              name: "Title",
              description: "Заголовок мудборда",
            })}
          >
            {slideData?.title || "МУДБОРД"}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[1.25fr_0.8fr_1.25fr] gap-6 h-[490px]">
          <div className="overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
            <img
              {...promptTargetAttrs({
                path: `images[${0}].__image_prompt__`,
                type: "image",
                name: "Общий вид линейки",
                description: "Цельный подарочный набор",
              })}
              src={i0}
              alt={imgs[0]?.__image_prompt__ || "Общий вид подарочного набора"}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
            <img
              {...promptTargetAttrs({
                path: `images[${1}].__image_prompt__`,
                type: "image",
                name: "Материал и отделка",
                description: "Деталь материала, фактуры или печати",
              })}
              src={i1}
              alt={imgs[1]?.__image_prompt__ || "Материал и отделка компонента"}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-rows-2 gap-6">
            <div className="overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: `images[${2}].__image_prompt__`,
                  type: "image",
                  name: "Упаковка",
                  description: "Упаковка и комплектование линейки",
                })}
                src={i2}
                alt={imgs[2]?.__image_prompt__ || "Упаковка подарочного набора"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: `images[${3}].__image_prompt__`,
                  type: "image",
                  name: "Использование или вручение",
                  description: "Сценарий вручения или распаковки подарочного набора",
                })}
                src={i3}
                alt={imgs[3]?.__image_prompt__ || "Вручение или распаковка подарочного набора"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



