"use client";

import React, { useMemo, useRef } from "react";
import EditableLayoutWrapper from "../components/EditableLayoutWrapper";
import SlideErrorBoundary from "../components/SlideErrorBoundary";
import TiptapTextReplacer from "../components/TiptapTextReplacer";
import { validate as uuidValidate } from 'uuid';
import { getLayoutByLayoutId } from "@/app/presentation-templates";
import { useCustomTemplateDetails } from "@/app/hooks/useCustomTemplates";
import { updateSlideContent } from "@/store/slices/presentationGeneration";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";




export const V1ContentRender = ({ slide, isEditMode, theme }: { slide: any, isEditMode: boolean, theme?: any, enableEditMode?: boolean }) => {
    const dispatch = useDispatch();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const layoutGroup = typeof slide?.layout_group === "string" ? slide.layout_group : "";
    const layoutId = typeof slide?.layout === "string" ? slide.layout : "";
    const slideContent = slide?.content && typeof slide.content === "object" ? slide.content : {};
    const customTemplateId = layoutGroup.startsWith("custom-") ? layoutGroup.split("custom-")[1] : layoutGroup;
    const isCustomTemplate = Boolean(layoutGroup) && (uuidValidate(customTemplateId) || layoutGroup.startsWith("custom-"));

    // Always call the hook (React hooks rule), but with empty id when not a custom template
    const { template: customTemplate, loading: customLoading } = useCustomTemplateDetails({
        id: isCustomTemplate ? customTemplateId : "",
        name: isCustomTemplate ? layoutGroup : "",
        description: ""
    });


    // Memoize layout resolution to prevent unnecessary recalculations
    const Layout = useMemo(() => {
        if (!layoutGroup || !layoutId) {
            return null;
        }
        if (isCustomTemplate) {
            if (customTemplate) {
                const customLayoutId = layoutId.startsWith("custom-") ? layoutId.split(":")[1] : layoutId;


                const compiledLayout = customTemplate.layouts.find(
                    (layout) => layout.layoutId === customLayoutId
                );


                return compiledLayout?.component ?? null;
            }
            return null;
        } else {
            const template = getLayoutByLayoutId(layoutId, layoutGroup);
            return template?.component ?? null;
        }
    }, [isCustomTemplate, customTemplate, layoutGroup, layoutId]);

    if (slide?.properties?.generationState === "not_generated") {
        return (
            <div className="flex h-full aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <p className="text-center text-base font-medium text-gray-700">
                    Слайд ещё не сгенерирован
                </p>
                <p className="mt-1 text-center text-sm text-gray-500">
                    Выберите его в Brief, когда будете готовы создать визуал.
                </p>
            </div>
        );
    }

    if (!slide || !layoutGroup || !layoutId) {
        return (
            <div className="flex h-full aspect-video flex-col items-center justify-center rounded-lg bg-gray-100">
                <p className="text-center text-base text-gray-600">Slide preview unavailable</p>
            </div>
        );
    }

    // Show loading state for custom templates
    if (isCustomTemplate && customLoading) {
        return (
            <div className="flex flex-col items-center justify-center aspect-video h-full bg-gray-100 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
            </div>
        );
    }


    if (!Layout) {
        if (Object.keys(slideContent).length === 0) {
            return (
                <div className="flex flex-col items-center cursor-pointer justify-center aspect-video h-full bg-gray-100 rounded-lg">
                    <p className="text-gray-600 text-center text-base">Blank Slide</p>
                    <p className="text-gray-600 text-center text-sm">This slide is empty. Please add content to it using the edit button.</p>
                </div>
            )
        }
        return (
            <div className="flex flex-col items-center justify-center aspect-video h-full bg-gray-100 rounded-lg">
                <p className="text-gray-600 text-center text-base">
                    Layout &quot;{slide.layout}&quot; not found in &quot;
                    {slide.layout_group}&quot; Template
                </p>
            </div>
        );
    }
    const LayoutComp = Layout as React.ComponentType<{ data: any }>;

    if (isEditMode) {
        return (
            <SlideErrorBoundary label={`Slide ${slide.index + 1}`}>
                <div ref={containerRef} className={` `}>

                    <EditableLayoutWrapper
                        slideIndex={slide.index}
                        slideData={slideContent}
                        properties={slide.properties}
                    >
                        <TiptapTextReplacer
                            key={slide.id}
                            slideData={slideContent}
                            slideIndex={slide.index}
                            onContentChange={(
                                content: string,
                                dataPath: string,
                                slideIndex?: number
                            ) => {
                                if (dataPath && slideIndex !== undefined) {
                                    dispatch(
                                        updateSlideContent({
                                            slideIndex: slideIndex,
                                            dataPath: dataPath,
                                            content: content,
                                        })
                                    );
                                }
                            }}
                        >
                            <LayoutComp data={{
                                ...slideContent,
                                _logo_url__: theme ? theme.logo_url : null,
                                __companyName__: (theme && theme.company_name) ? theme.company_name : null,
                            }} />
                        </TiptapTextReplacer>
                    </EditableLayoutWrapper>



                </div>
            </SlideErrorBoundary>

        );
    }
    return (
        <SlideErrorBoundary label={`Slide ${slide.index + 1}`}>
            <div ref={containerRef}>
                <TiptapTextReplacer
                    key={slide.id}
                    slideData={slideContent}
                    slideIndex={slide.index}
                    readOnly
                >
                    <LayoutComp data={{
                        ...slideContent,
                        _logo_url__: theme ? theme.logo_url : null,
                        __companyName__: (theme && theme.company_name) ? theme.company_name : null,
                    }} />
                </TiptapTextReplacer>
            </div>
        </SlideErrorBoundary>
    );
};

