import React from 'react'
import * as z from 'zod'
import {
  resolveColor,
  resolveFontFamily,
  resolveRootStyle,
} from '../_shared/style'
import { promptTargetAttrs } from '@/app/(presentation-generator)/components/PromptTarget'

const layoutId = "title-event-header-slide"
const layoutName = "Title Event Header Slide"
const layoutDescription = "Обложка концепции декорационного оформления: тип документа и точное название мероприятия только из брифа."

const Schema = z.object({
  documentType: z
    .string()
    .min(5)
    .max(50)
    .default("Концепция оформления")
    .meta({
      description:
        "Тип документа из брифа или контекста: концепция декорационного оформления. Не добавлять дату, тему, площадку и формат без основания.",
    }),
  eventName: z
    .string()
    .min(5)
    .max(100)
    .default("НАЗВАНИЕ МЕРОПРИЯТИЯ")
    .meta({
      description:
        "Название мероприятия точно из брифа. Не придумывать повод, аудиторию, бренд, место или дату.",
    }),
})

type TitleEventHeaderData = z.infer<typeof Schema>

interface TitleEventHeaderLayoutProps {
  data?: Partial<TitleEventHeaderData>
}

const dynamicSlideLayout: React.FC<TitleEventHeaderLayoutProps> = ({ data: slideData }) => {
  const rootFont = resolveFontFamily(slideData, "container", "var(--template-font, Inter)", "body")
  const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary")
  const titleFont = resolveFontFamily(slideData, "title", rootFont, "display")
  const kickerFont = resolveFontFamily(slideData, "document_type", rootFont, "body")
  const kickerColor = resolveColor(slideData, "document_type", "color", titleColor, "text_primary")
  const accentColor = resolveColor(slideData, "accent_line", "background", "#7F8C8D", "accent")
  const dotBorder = resolveColor(slideData, "accent_dot", "borderColor", titleColor, "text_primary")
  const blobOne = resolveColor(slideData, "bg_blob_1", "background", "#EAEAEA", "surface")
  const blobTwo = resolveColor(slideData, "bg_blob_2", "background", "#D8D6D3", "surface")

  return (
    <div
      className="relative w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video z-20 mx-auto overflow-hidden"
      style={resolveRootStyle(slideData, "#FFFFFF", "var(--template-font, Inter)")}
    >
      <div className="absolute inset-0">
        <div
          className="absolute -top-24 -left-28 w-[560px] h-[420px] rounded-full opacity-55 blur-2xl"
          style={{ backgroundColor: blobOne }}
        />
        <div
          className="absolute -bottom-32 -right-36 w-[740px] h-[540px] rounded-full opacity-45 blur-2xl"
          style={{ backgroundColor: blobTwo }}
        />
      </div>

      <div className="relative h-full px-[72px] pt-24 pb-14 flex flex-col">

        {/* Верхний kicker */}
        <div>
          <div
            {...promptTargetAttrs({
              path: "documentType",
              type: "field",
              name: "Document type",
              description: "Тип концепции оформления",
            })}
            className="text-[24px] leading-[32px] font-[500] uppercase tracking-[0.02em]"
            style={{ color: kickerColor, fontFamily: kickerFont }}
          >
            {slideData?.documentType || "Концепция оформления"}
          </div>
        </div>

        {/* Центрированный по вертикали блок */}
        <div className="flex-1 flex items-center">
          <div>
            <div
              {...promptTargetAttrs({
                path: "eventName",
                type: "field",
                name: "Event name",
                description: "Точное название мероприятия из брифа",
              })}
              className="max-w-[980px] text-[64px] leading-[68px] font-[800] uppercase tracking-[0.4px] text-left"
              style={{ color: titleColor, fontFamily: titleFont }}
            >
              {slideData?.eventName || "НАЗВАНИЕ МЕРОПРИЯТИЯ"}
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="w-20 h-1.5" style={{ backgroundColor: accentColor }} />
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: dotBorder }}
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
