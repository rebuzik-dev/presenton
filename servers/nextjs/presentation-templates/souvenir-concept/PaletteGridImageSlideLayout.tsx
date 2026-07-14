import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveContrastTextColor,
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
    .default("Сувенирная продукция или материалы, показывающие применение палитры из брифа")
    .meta({ description: "Кадр применения палитры на изделиях, материалах или упаковке без случайного текста и логотипов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z.string().min(1).max(60).default("нейтральная иконка").meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "palette-grid-image-slide"
const layoutName = "Palette Grid Image Slide"
const layoutDescription =
  "Палитра сувенирной линейки: фирменные цвета из брифа либо обоснованное сочетание под аудиторию, материалы и назначение изделий."

const ColorCardSchema = z.object({
  hex: z.string().min(4).max(9).default("#DEDDDD").meta({ description: "HEX из брендбука или предложенный цвет, если палитра не задана." }),
  name: z.string().min(3).max(28).default("Роль цвета").meta({ description: "Короткая роль цвета в изделии, материале, печати или упаковке." }),
})

const Schema = z.object({
  title: z.string().min(5).max(30).default("ЦВЕТОВАЯ ПАЛИТРА").meta({ description: "Универсальный заголовок раздела с палитрой." }),
  leftHeader: z.string().min(3).max(30).default("Основные цвета").meta({ description: "Заголовок группы основных цветов." }),
  rightHeader: z.string().min(3).max(40).default("Дополнительные цвета").meta({ description: "Заголовок группы дополнительных цветов." }),
  primary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#F1EFEA", name: "Светлая база" },
      { hex: "#30383D", name: "Основной контраст" },
      { hex: "#B58A56", name: "Фирменный акцент" },
    ])
    .meta({
      description:
        "Три основных цвета: сначала точные брендовые значения из брифа, иначе обоснованная палитра для сувенирной линейки.",
    }),
  secondary: z
    .array(ColorCardSchema)
    .min(3)
    .max(3)
    .default([
      { hex: "#D7C9B8", name: "Материальный тон" },
      { hex: "#6D7A70", name: "Поддерживающий цвет" },
      { hex: "#FFFFFF", name: "Нейтральный фон" },
    ])
    .meta({
      description:
        "Три дополнительных цвета, которые поддерживают материалы, отделку, печать и упаковку; не дублировать основные.",
    }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Сувенирные изделия, материалы или упаковка из концепции, на которых заметно применение выбранной палитры",
  }).meta({ description: "Изображение демонстрирует палитру на сувенирной продукции, материале или упаковке из выбранной линейки." }),
})

type PaletteGridImageSlideData = z.infer<typeof Schema>

interface PaletteGridImageSlideLayoutProps {
  data?: Partial<PaletteGridImageSlideData>
}

const dynamicSlideLayout: React.FC<PaletteGridImageSlideLayoutProps> = ({ data: slideData }) => {
  const primary = slideData?.primary || []
  const secondary = slideData?.secondary || []
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const sectionFont = resolveFontFamily(slideData, "section_title", rootFont, "heading")
  const cardFont = resolveFontFamily(slideData, "color_card", rootFont, "body")
  const ColorCard: React.FC<{ hex: string; name: string; pathPrefix: string; index: number }> = ({ hex, name, pathPrefix, index }) => {
    const textColor = resolveContrastTextColor(hex)
    return (
      <div className="h-[116px] px-5 py-4 flex flex-col justify-between" style={{ backgroundColor: hex }}>
        <div
          {...promptTargetAttrs({
            path: `${pathPrefix}[${index}].hex`,
            type: "field",
            name: `Color ${index + 1} hex`,
            description: "HEX-код цветового образца",
          })}
          className="text-[17px] leading-[21px] tracking-[0.4px] font-[700]"
          style={{ color: textColor, fontFamily: cardFont }}
        >
          {hex}
        </div>
        <div
          {...promptTargetAttrs({
            path: `${pathPrefix}[${index}].name`,
            type: "field",
            name: `Color ${index + 1} name`,
            description: "Название или роль цвета",
          })}
          className="text-[18px] leading-[22px] font-[500]"
          style={{ color: textColor, fontFamily: cardFont }}
        >
          {name}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden" style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}>
      <div className="h-full px-[68px] pt-10 pb-12 grid grid-cols-[1.05fr_0.95fr] gap-9">
        <div className="flex flex-col min-h-0">
          <div className="text-[46px] leading-[52px] font-[900] uppercase text-[var(--style-text-primary)]" style={{ color: titleColor, fontFamily: titleFont }}>
            <span
              {...promptTargetAttrs({
                path: "title",
                type: "field",
                name: "Title",
                description: "Главный заголовок палитры",
              })}
            >
              {slideData?.title || "ЦВЕТОВАЯ ПАЛИТРА"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 items-start gap-x-5 gap-y-4 h-[490px] content-start min-h-0">
            <div className="text-[22px] leading-[28px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
              <span
                {...promptTargetAttrs({
                  path: "leftHeader",
                  type: "field",
                  name: "Left header",
                  description: "Заголовок основных цветов",
                })}
              >
                {slideData?.leftHeader || "Основные цвета"}
              </span>
            </div>
            <div className="text-[22px] leading-[28px] text-[var(--style-text-primary)] font-[500]" style={{ color: titleColor, fontFamily: sectionFont }}>
              <span
                {...promptTargetAttrs({
                  path: "rightHeader",
                  type: "field",
                  name: "Right header",
                  description: "Заголовок дополнительных цветов",
                })}
              >
                {slideData?.rightHeader || "Дополнительные цвета"}
              </span>
            </div>
            <div className="grid gap-5 min-h-0">
              {primary.slice(0, 3).map((c, idx) => (
                <ColorCard key={`p-${idx}`} hex={c.hex} name={c.name} pathPrefix="primary" index={idx} />
              ))}
            </div>
            <div className="grid gap-5 min-h-0">
              {secondary.slice(0, 3).map((c, idx) => (
                <ColorCard key={`s-${idx}`} hex={c.hex} name={c.name} pathPrefix="secondary" index={idx} />
              ))}
            </div>
          </div>
        </div>

        <div className="h-full flex flex-col min-h-0">
          <div className="h-[52px]"></div>
          <div className="mt-6 w-full h-[490px] overflow-hidden">
            <img
              {...promptTargetAttrs({
                path: "image.__image_prompt__",
                type: "image",
                name: "Palette image prompt",
                description: "ТЗ изображения с применением палитры",
              })}
              src={slideData?.image?.__image_url__ || "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg"}
              alt={slideData?.image?.__image_prompt__ || "image"}
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



