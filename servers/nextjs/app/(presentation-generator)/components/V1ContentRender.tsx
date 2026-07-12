"use client";

import React, { ReactNode, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { validate as uuidValidate } from "uuid";

import { useCustomTemplateDetails } from "@/app/hooks/useCustomTemplates";
import { getLayoutByLayoutId } from "@/app/presentation-templates";
import { updateSlideContent } from "@/store/slices/presentationGeneration";
import EditableLayoutWrapper from "./EditableLayoutWrapper";
import SlideErrorBoundary from "./SlideErrorBoundary";
import SlideMediaLayout from "./SlideMediaLayout";
import TiptapTextReplacer from "./TiptapTextReplacer";

function SlideRuntime({
  children,
  slide,
}: {
  children: ReactNode;
  slide: any;
}) {
  return (
    <div
      data-slide-root="true"
      data-slide-index={slide?.index}
      data-slide-id={slide?.id}
      data-layout-container="slide-root"
      className="layout-validation-slide-root h-full w-full"
    >
      <SlideMediaLayout
        slideData={slide?.content || {}}
        slideIndex={slide?.index || 0}
        properties={slide?.properties}
      >
        {children}
      </SlideMediaLayout>
    </div>
  );
}

function LoadingSlideRuntime({ children }: { children: ReactNode }) {
  return (
    <div
      className="h-full w-full"
      data-slide-render-state="loading"
      data-slide-root="true"
    >
      {children}
    </div>
  );
}

export const V1ContentRender = ({
  slide,
  isEditMode,
  theme,
}: {
  slide: any;
  isEditMode: boolean;
  theme?: any;
  enableEditMode?: boolean;
}) => {
  const dispatch = useDispatch();
  const layoutGroup = typeof slide?.layout_group === "string" ? slide.layout_group : "";
  const layoutId = typeof slide?.layout === "string" ? slide.layout : "";
  const slideContent = slide?.content && typeof slide.content === "object" ? slide.content : {};
  const customTemplateId = layoutGroup.startsWith("custom-")
    ? layoutGroup.split("custom-")[1]
    : layoutGroup;
  const isCustomTemplate =
    Boolean(layoutGroup) &&
    (uuidValidate(customTemplateId) || layoutGroup.startsWith("custom-"));

  const { template: customTemplate, loading: customLoading } =
    useCustomTemplateDetails({
      id: isCustomTemplate ? customTemplateId : "",
      name: isCustomTemplate ? layoutGroup : "",
      description: "",
    });

  const Layout = useMemo(() => {
    if (!layoutGroup || !layoutId) return null;
    if (isCustomTemplate) {
      if (!customTemplate) return null;
      const customLayoutId = layoutId.startsWith("custom-")
        ? layoutId.split(":")[1]
        : layoutId;
      return (
        customTemplate.layouts.find((layout) => layout.layoutId === customLayoutId)
          ?.component ?? null
      );
    }
    return getLayoutByLayoutId(layoutId, layoutGroup)?.component ?? null;
  }, [customTemplate, isCustomTemplate, layoutGroup, layoutId]);

  if (slide?.properties?.generationState === "not_generated") {
    return (
      <SlideRuntime slide={slide}>
        <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <p className="text-center text-base font-medium text-gray-700">
            Слайд ещё не сгенерирован
          </p>
          <p className="mt-1 text-center text-sm text-gray-500">
            Выберите его в Brief, когда будете готовы создать визуал.
          </p>
        </div>
      </SlideRuntime>
    );
  }

  if (!slide || !layoutGroup || !layoutId) {
    return (
      <SlideRuntime slide={slide}>
        <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-100">
          <p className="text-center text-base text-gray-600">Slide preview unavailable</p>
        </div>
      </SlideRuntime>
    );
  }

  if (isCustomTemplate && customLoading) {
    return (
      <LoadingSlideRuntime>
        <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-100">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </LoadingSlideRuntime>
    );
  }

  if (!Layout) {
    return (
      <SlideRuntime slide={slide}>
        <div className="flex h-full cursor-pointer flex-col items-center justify-center rounded-lg bg-gray-100">
          {Object.keys(slideContent).length === 0 ? (
            <>
              <p className="text-center text-base text-gray-600">Blank Slide</p>
              <p className="text-center text-sm text-gray-600">
                This slide is empty. Please add content to it using the edit button.
              </p>
            </>
          ) : (
            <p className="text-center text-base text-gray-600">
              Layout &quot;{slide.layout}&quot; not found in &quot;{slide.layout_group}&quot; Template
            </p>
          )}
        </div>
      </SlideRuntime>
    );
  }

  const LayoutComp = Layout as React.ComponentType<{ data: any }>;
  const layoutValidationBlocks =
    slide?.properties?.layoutValidation?.groups ||
    slide?.properties?.layoutValidation?.blocks ||
    {};
  const layoutData = {
    ...slideContent,
    _logo_url__: theme ? theme.logo_url : null,
    __companyName__: theme?.company_name || null,
  };

  const renderedLayout = (
    <SlideRuntime slide={slide}>
      <TiptapTextReplacer
        key={slide.id}
        slideData={slideContent}
        slideIndex={slide.index}
        layoutValidationBlocks={layoutValidationBlocks}
        readOnly={!isEditMode}
        onContentChange={(content: string, dataPath: string, slideIndex?: number) => {
          if (dataPath && slideIndex !== undefined) {
            dispatch(updateSlideContent({ slideIndex, dataPath, content }));
          }
        }}
      >
        <LayoutComp data={layoutData} />
      </TiptapTextReplacer>
    </SlideRuntime>
  );

  return (
    <SlideErrorBoundary label={`Slide ${slide.index + 1}`}>
      {isEditMode ? (
        <EditableLayoutWrapper
          slideIndex={slide.index}
          slideData={slideContent}
          properties={slide.properties}
        >
          {renderedLayout}
        </EditableLayoutWrapper>
      ) : (
        renderedLayout
      )}
    </SlideErrorBoundary>
  );
};
