"use client";
import React, { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useLayout } from "../context/LayoutContext";
import EditableLayoutWrapper from "../components/EditableLayoutWrapper";
import SlideErrorBoundary from "../components/SlideErrorBoundary";
import TiptapTextReplacer from "../components/TiptapTextReplacer";
import { updateSlideContent } from "../../../store/slices/presentationGeneration";
import { Loader2 } from "lucide-react";

export const useTemplateLayouts = () => {
  const dispatch = useDispatch();
  const { getLayoutById, getLayout, loading } =
    useLayout();

  const getTemplateLayout = useCallback((layoutId: string) => {
    const layout = getLayoutById(layoutId);
    return layout ? getLayout(layoutId) : null;
  }, [getLayoutById, getLayout]);



  // Render slide content with group validation, automatic Tiptap text editing, and editable images/icons
  const renderSlideContent = useCallback(
    (
      slide: any,
      isEditMode: boolean,
      options?: { enableTextReplacer?: boolean }
    ) => {
      const enableTextReplacer = options?.enableTextReplacer ?? true;

      if (!slide) {
        return (
          <div className="flex flex-col items-center justify-center aspect-video h-full bg-gray-100 rounded-lg">
            <p className="text-gray-400 font-medium">Draft</p>
          </div>
        );
      }

      const Layout = getTemplateLayout(slide.layout);
      if (loading) {
        return (
          <div className="flex flex-col items-center justify-center aspect-video h-full bg-gray-100 rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
          </div>
        );
      }
      if (!Layout) {
        return (
          <div className="flex flex-col items-center justify-center aspect-video h-full bg-gray-100 rounded-lg">
            <p className="text-gray-600 text-center text-base">
              Layout &quot;{slide.layout}&quot; not found in &quot;
              {slide.layout_group}&quot; group
            </p>
          </div>
        );
      }

      const slideContent = (
        <SlideErrorBoundary label={`Slide ${slide.index + 1}`}>
          <Layout data={slide.content} />
        </SlideErrorBoundary>
      );

      // Wrap with TiptapTextReplacer to process Markdown text
      // In edit mode: it's editable and updates Redux
      // In view mode: it's read-only but renders Markdown
      const withTextReplacer = (
        <TiptapTextReplacer
          key={slide.id}
          slideData={slide.content}
          slideIndex={slide.index}
          layoutValidationBlocks={
            slide?.properties?.layoutValidation?.groups ||
            slide?.properties?.layoutValidation?.blocks ||
            {}
          }
          isEditable={isEditMode}
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
          {slideContent}
        </TiptapTextReplacer>
      );

      const renderedContent = enableTextReplacer
        ? withTextReplacer
        : slideContent;

      const contentWithLayoutRoot = (
        <div
          data-slide-root="true"
          data-slide-index={slide.index}
          data-slide-id={slide.id}
          data-layout-container="slide-root"
          className="layout-validation-slide-root"
        >
          {renderedContent}
        </div>
      );

      if (isEditMode) {
        return (
          <EditableLayoutWrapper
            slideIndex={slide.index}
            slideData={slide.content}
            properties={slide.properties}
          >
            {contentWithLayoutRoot}
          </EditableLayoutWrapper>
        );
      }

      return contentWithLayoutRoot;
    },
    [getTemplateLayout, dispatch, loading]
  );

  return {
    getTemplateLayout,
    renderSlideContent,
    loading,
  };
};
