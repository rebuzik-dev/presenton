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
    .default("Кадр визуальной системы кейтеринга на основе брифа")
    .meta({ description: "Один самостоятельный кадр кейтеринг-мудборда. Не повторять композицию соседних слотов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z
    .string()
    .min(1)
    .max(60)
    .default("иконка кейтеринг-мудборда")
    .meta({ description: "Короткое описание иконки, только если она требуется layout." }),
})

const layoutId = "header-moodboard-collage-slide"
const layoutName = "Header Moodboard Collage Slide"
const layoutDescription =
  "Четырёхкадровый кейтеринг-мудборд: общий вид сервиса, гостевой сценарий, деталь подачи и материалы или бренд-акценты в едином стиле."

const Schema = z.object({
  title: z
    .string()
    .min(3)
    .max(20)
    .default("МУДБОРД")
    .meta({ description: "Короткий заголовок кейтеринг-мудборда." }),
  images: z
    .array(ImageSchema)
    .min(4)
    .max(4)
    .default([
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Общий вид кейтеринг-зоны в контексте площадки и формата мероприятия" },
      { __image_url__: "https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg", __image_prompt__: "Гости взаимодействуют с подачей или сервисной зоной в естественном сценарии мероприятия" },
      { __image_url__: "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg", __image_prompt__: "Крупный план блюда, напитка или порционной подачи из концепции меню" },
      { __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg", __image_prompt__: "Материалы сервировки, упаковки или бренд-акценты кейтеринга без случайного текста" },
    ])
    .meta({ description: "Ровно четыре разных кадра в общей визуальной системе; палитра и стиль передаются отдельно через image_style." }),
})

type HeaderMoodboardCollageSlideData = z.infer<typeof Schema>

interface HeaderMoodboardCollageSlideLayoutProps {
  data?: Partial<HeaderMoodboardCollageSlideData>
}

const dynamicSlideLayout: React.FC<HeaderMoodboardCollageSlideLayoutProps> = ({ data: slideData }) => {
  const imgs = slideData?.images || []
  const imageItems = [
    {
      url: imgs[0]?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      prompt: imgs[0]?.__image_prompt__ || "Общий вид кейтеринг-зоны",
    },
    {
      url: imgs[1]?.__image_url__ || "https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg",
      prompt: imgs[1]?.__image_prompt__ || "Гостевой сценарий и сервис",
    },
    {
      url: imgs[2]?.__image_url__ || "https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg",
      prompt: imgs[2]?.__image_prompt__ || "Деталь подачи блюда",
    },
    {
      url: imgs[3]?.__image_url__ || "https://images.pexels.com/photos/2693212/pexels-photo-2693212.jpeg",
      prompt: imgs[3]?.__image_prompt__ || "Материалы и бренд-акценты",
    },
  ]
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const surfaceColor = resolveColor(slideData, "image_placeholder", "background", "#E6E6E6", "surface")

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[72px] pt-12 pb-12">
        <div
          className="text-[52px] leading-[58px] font-[900] uppercase text-[var(--style-text-primary)]"
          style={{ color: titleColor, fontFamily: titleFont }}
          {...promptTargetAttrs({
            path: "title",
            type: "field",
            name: "Главный заголовок",
            description: "Название мудборда",
            role: "main_title",
          })}
        >
          {slideData?.title || "МУДБОРД"}
        </div>

        <div className="mt-6 grid grid-cols-[1.15fr_0.7fr_1.15fr] gap-7 h-[492px]">
          <div
            className="overflow-hidden bg-[var(--style-surface)] h-full"
            style={{ backgroundColor: surfaceColor }}
            {...promptTargetAttrs({
              path: `images[${0}].__image_prompt__`,
              type: "image",
              name: "Изображение мудборда 1",
              description: "Левое изображение коллажа",
              role: "collage_image",
            })}
          >
            <img src={imageItems[0].url} alt={imageItems[0].prompt} className="w-full h-full object-cover" />
          </div>

          <div
            className="overflow-hidden bg-[var(--style-surface)] h-full"
            style={{ backgroundColor: surfaceColor }}
            {...promptTargetAttrs({
              path: `images[${1}].__image_prompt__`,
              type: "image",
              name: "Изображение мудборда 2",
              description: "Центральное изображение коллажа",
              role: "collage_image",
            })}
          >
            <img src={imageItems[1].url} alt={imageItems[1].prompt} className="w-full h-full object-cover" />
          </div>

          <div className="grid grid-rows-2 gap-7 h-full">
            <div
              className="overflow-hidden bg-[var(--style-surface)]"
              style={{ backgroundColor: surfaceColor }}
              {...promptTargetAttrs({
                path: `images[${2}].__image_prompt__`,
                type: "image",
                name: "Изображение мудборда 3",
                description: "Верхнее правое изображение коллажа",
                role: "collage_image",
              })}
            >
              <img src={imageItems[2].url} alt={imageItems[2].prompt} className="w-full h-full object-cover" />
            </div>
            <div
              className="overflow-hidden bg-[var(--style-surface)]"
              style={{ backgroundColor: surfaceColor }}
              {...promptTargetAttrs({
                path: `images[${3}].__image_prompt__`,
                type: "image",
                name: "Изображение мудборда 4",
                description: "Нижнее правое изображение коллажа",
                role: "collage_image",
              })}
            >
              <img src={imageItems[3].url} alt={imageItems[3].prompt} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Schema, layoutId, layoutName, layoutDescription }
export default dynamicSlideLayout



