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
    .default("Кадр подарочного набора на основе брифа")
    .meta({ description: "Самостоятельный кадр линейки, детали или сценария вручения; без случайного текста и логотипов." }),
})

const IconSchema = z.object({
  __icon_url__: z.string().default("").meta({ description: "Служебный URL иконки." }),
  __icon_prompt__: z.string().min(1).max(60).default("нейтральная иконка").meta({ description: "Короткое описание иконки, если она требуется layout." }),
})

const layoutId = "proposals-collage-left-right-stack-slide"
const layoutName = "Proposals Collage Left Right Stack Slide"
const layoutDescription =
  "Итоговый коллаж подарочного набора: общий вид, деталь компонента и сценарий упаковки, распаковки или вручения."

const LabeledImageSchema = z.object({
  label: z.string().min(2).max(22).default("Линейка").meta({ description: "Короткая роль кадра или название позиции из брифа." }),
  image: ImageSchema.default({
    __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
    __image_prompt__: "Кадр концепции подарочного набора, связанный с подписью и требованиями брифа",
  }).meta({ description: "Изображение для указанной роли; три кадра должны отличаться масштабом и содержанием." }),
})

const Schema = z.object({
  titlePrefix: z.string().min(10).max(30).default("ПРЕДЛОЖЕНИЯ ПО").meta({ description: "Короткая строка перед названием категории. До 2 слов." }),
  blockName: z.string().min(3).max(20).default("ЛИНЕЙКЕ").meta({ description: "Короткое название категории или набора из брифа." }),
  tags: z
    .array(z.string().min(2).max(22).meta({ description: "Короткая характеристика предложения. До 2 слов." }))
    .min(2)
    .max(3)
    .default(["Линейка", "Деталь", "Вручение"])
    .meta({ description: "Три роли кадров: общий вид, значимая деталь и контекст использования или вручения." }),
  left: LabeledImageSchema.default({
    label: "Линейка",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Общий вид согласованного подарочного набора для получателя из брифа",
    },
  }).meta({ description: "Крупный левый кадр: общий вид всей линейки или ключевого набора." }),
  rightTop: LabeledImageSchema.default({
    label: "Деталь",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Крупный план материала, отделки, печати или функциональной детали одного компонента подарочного набора",
    },
  }).meta({ description: "Верхний правый кадр: отличимая материальная или производственная деталь." }),
  rightBottom: LabeledImageSchema.default({
    label: "Вручение",
    image: {
      __image_url__: "https://images.pexels.com/photos/31527637/pexels-photo-31527637.jpeg",
      __image_prompt__: "Упаковка, комплектование, распаковка или вручение подарочного набора в естественном контексте мероприятия",
    },
  }).meta({ description: "Нижний правый кадр: упаковка, распаковка или взаимодействие получателя с подарочным набором." }),
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

        <div className="mt-6 grid grid-cols-[1.6fr_1fr] gap-8 h-[490px]">
          <div className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
            <img
              {...promptTargetAttrs({
                path: "left.image.__image_prompt__",
                type: "image",
                name: "Left image prompt",
                description: "ТЗ главного изображения предложения",
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
                  description: "Подпись главного изображения",
                })}
              >
                {slideData?.left?.label || "Линейка"}
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
                  description: "ТЗ верхнего изображения с отдельным ракурсом",
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
                    description: "Подпись верхнего изображения",
                  })}
                >
                  {slideData?.rightTop?.label || "Деталь"}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden bg-[var(--style-surface)]" style={{ backgroundColor: surfaceColor }}>
              <img
                {...promptTargetAttrs({
                  path: "rightBottom.image.__image_prompt__",
                  type: "image",
                  name: "Right bottom image prompt",
                  description: "ТЗ нижнего изображения с отдельной деталью",
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
                    description: "Подпись нижнего изображения",
                  })}
                >
                  {slideData?.rightBottom?.label || "Вручение"}
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



