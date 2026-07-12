"use client";

import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateSlideImage, updateSlideIcon, updateImageProperties } from '@/store/slices/presentationGeneration';
import ImageEditor from './ImageEditor';
import IconsEditor from './IconsEditor';
import { findBestSlideMediaPath } from '../utils/slideMedia';

interface EditableLayoutWrapperProps {
    children: ReactNode;
    slideIndex: number;
    slideData: any;
    isEditMode?: boolean;
    properties?: any;

}

interface EditableElement {
    id: string;
    type: 'image' | 'icon';
    src: string;
    dataPath: string;
    data: any;
    element: HTMLImageElement | SVGElement;
}

const EditableLayoutWrapper: React.FC<EditableLayoutWrapperProps> = ({
    children,
    slideIndex,
    slideData,

}) => {
    const dispatch = useDispatch();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editableElements, setEditableElements] = useState<EditableElement[]>([]);
    const [activeEditor, setActiveEditor] = useState<EditableElement | null>(null);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [draggedElement, setDraggedElement] = useState<EditableElement | null>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const dragStartElementPos = useRef<{ x: number; y: number } | null>(null);
    const clickThreshold = 5; // pixels - distinguish click from drag

    /**
     * Finds and processes images in the DOM, making them editable
     */
    const findAndProcessImages = () => {
        if (!containerRef.current) return;

        const imgElements = containerRef.current.querySelectorAll('img:not([data-editable-processed])');
        const svgElements = containerRef.current.querySelectorAll('svg:not([data-editable-processed])');
        const newEditableElements: EditableElement[] = [];

        imgElements.forEach((img, index) => {
            const htmlImg = img as HTMLImageElement;
            const src = htmlImg.src;

            if (src) {
                const result = findBestSlideMediaPath(
                    src,
                    htmlImg,
                    slideData,
                    containerRef.current,
                );

                if (result) {
                    const { path: dataPath, type, data } = result;

                    // Mark as processed to prevent re-processing
                    htmlImg.setAttribute('data-editable-processed', 'true');

                    // Add a unique identifier to help with debugging
                    htmlImg.setAttribute('data-editable-id', `${slideIndex}-${type}-${dataPath}-${index}`);

                    const editableElement: EditableElement = {
                        id: `${slideIndex}-${type}-${dataPath}-${index}`,
                        type,
                        src,
                        dataPath,
                        data,
                        element: htmlImg
                    };

                    newEditableElements.push(editableElement);

                    // Add mousedown handler for dragging
                    const mouseDownHandler = (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();

                        dragStartPos.current = { x: e.clientX, y: e.clientY };

                        // Get current position from left/top style
                        const element = htmlImg as HTMLElement;
                        const currentX = parseFloat(element.style.left) || 0;
                        const currentY = parseFloat(element.style.top) || 0;

                        dragStartElementPos.current = { x: currentX, y: currentY };
                        setDraggedElement(editableElement);
                    };

                    htmlImg.addEventListener('mousedown', mouseDownHandler, { capture: true });

                    htmlImg.style.cursor = 'move';
                    htmlImg.style.transition = 'opacity 0.2s';

                    const mouseEnterHandler = () => {
                        htmlImg.style.opacity = '0.8';

                    };

                    const mouseLeaveHandler = () => {
                        htmlImg.style.opacity = '1';

                    };

                    htmlImg.addEventListener('mouseenter', mouseEnterHandler);
                    htmlImg.addEventListener('mouseleave', mouseLeaveHandler);

                    // Store cleanup functions
                    (htmlImg as any)._editableCleanup = () => {
                        htmlImg.removeEventListener('mousedown', mouseDownHandler, { capture: true });
                        htmlImg.removeEventListener('mouseenter', mouseEnterHandler);
                        htmlImg.removeEventListener('mouseleave', mouseLeaveHandler);
                        htmlImg.style.cursor = '';
                        htmlImg.style.transition = '';
                        htmlImg.style.opacity = '';
                        htmlImg.style.transform = '';
                        htmlImg.removeAttribute('data-editable-processed');
                    };
                }
            }
        });

        // Process SVG icons
        svgElements.forEach((svg, index) => {
            const svgEl = svg as SVGElement;
            const wrapperWithUrl = (svgEl as unknown as HTMLElement).closest('[data-path]') as HTMLElement | null;
            const src = wrapperWithUrl?.getAttribute('data-path') || '';

            if (src) {
                const result = findBestSlideMediaPath(
                    src,
                    svgEl,
                    slideData,
                    containerRef.current,
                );

                if (result && result.type === 'icon') {
                    const { path: dataPath, data } = result;

                    // Mark as processed to prevent re-processing
                    svgEl.setAttribute('data-editable-processed', 'true');

                    // Add a unique identifier to help with debugging
                    svgEl.setAttribute('data-editable-id', `${slideIndex}-icon-${dataPath}-svg-${index}`);

                    const editableElement: EditableElement = {
                        id: `${slideIndex}-icon-${dataPath}-svg-${index}`,
                        type: 'icon',
                        src,
                        dataPath,
                        data,
                        element: svgEl
                    };

                    newEditableElements.push(editableElement);

                    // Add click handler directly to the svg
                    const clickHandler = (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveEditor(editableElement);
                    };

                    svgEl.addEventListener('click', clickHandler, { capture: true });

                    // Add hover effects without changing layout
                    (svgEl as unknown as HTMLElement).style.cursor = 'pointer';
                    (svgEl as unknown as HTMLElement).style.transition = 'opacity 0.2s, transform 0.2s';

                    const mouseEnterHandler = () => {
                        (svgEl as unknown as HTMLElement).style.opacity = '0.8';
                    };

                    const mouseLeaveHandler = () => {
                        (svgEl as unknown as HTMLElement).style.opacity = '1';
                    };

                    svgEl.addEventListener('mouseenter', mouseEnterHandler as any);
                    svgEl.addEventListener('mouseleave', mouseLeaveHandler as any);

                    // Store cleanup functions
                    (svgEl as any)._editableCleanup = () => {
                        svgEl.removeEventListener('click', clickHandler, { capture: true });
                        svgEl.removeEventListener('mouseenter', mouseEnterHandler as any);
                        svgEl.removeEventListener('mouseleave', mouseLeaveHandler as any);
                        (svgEl as unknown as HTMLElement).style.cursor = '';
                        (svgEl as unknown as HTMLElement).style.transition = '';
                        (svgEl as unknown as HTMLElement).style.opacity = '';
                        (svgEl as unknown as HTMLElement).style.transform = '';
                        svgEl.removeAttribute('data-editable-processed');
                    };
                }
            }
        });


        setEditableElements(prev => [...prev, ...newEditableElements]);
    };

    /**
     * Cleanup function to remove event listeners and reset styles
     */
    const cleanupElements = () => {
        editableElements.forEach(({ element }) => {
            if ((element as any)._editableCleanup) {
                (element as any)._editableCleanup();
            }
        });
        setEditableElements([]);
    };

    // Wait for LoadableComponent to render and then process images
    useEffect(() => {
        const timer = setTimeout(() => {
            findAndProcessImages();
        }, 400);

        return () => {
            clearTimeout(timer);
            cleanupElements();
        };
    }, [slideData, children]);

    // Re-run when container content changes
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new MutationObserver((mutations) => {
            const hasNewMedia = mutations.some(mutation =>
                Array.from(mutation.addedNodes).some(node =>
                    node.nodeType === Node.ELEMENT_NODE &&
                    (
                        (node as Element).tagName === 'IMG' ||
                        (node as Element).tagName === 'SVG' ||
                        (node as Element).querySelector('img:not([data-editable-processed]), svg:not([data-editable-processed])')
                    )
                )
            );

            if (hasNewMedia) {
                setTimeout(findAndProcessImages, 100);
            }
        });

        observer.observe(containerRef.current, {
            childList: true,
            subtree: true
        });

        return () => observer.disconnect();
    }, [slideData]);

    // Global drag handlers
    useEffect(() => {
        if (!draggedElement) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartPos.current || !dragStartElementPos.current) return;

            const deltaX = e.clientX - dragStartPos.current.x;
            const deltaY = e.clientY - dragStartPos.current.y;

            // Check if movement exceeds click threshold to start dragging
            if (!isDragging && (Math.abs(deltaX) > clickThreshold || Math.abs(deltaY) > clickThreshold)) {
                setIsDragging(true);
            }

            if (isDragging) {
                const newX = dragStartElementPos.current.x + deltaX;
                const newY = dragStartElementPos.current.y + deltaY;

                // Apply position using left/top for absolute positioning
                const element = draggedElement.element as HTMLElement;
                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;
                element.style.zIndex = '1000';
                element.style.opacity = '0.7';
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!dragStartPos.current || !dragStartElementPos.current) {
                setDraggedElement(null);
                return;
            }

            const deltaX = e.clientX - dragStartPos.current.x;
            const deltaY = e.clientY - dragStartPos.current.y;
            const wasDragging = isDragging || (Math.abs(deltaX) > clickThreshold || Math.abs(deltaY) > clickThreshold);

            if (wasDragging && draggedElement) {
                // Save position
                const element = draggedElement.element as HTMLElement;
                element.style.opacity = '1';
                element.style.zIndex = '';

                const finalX = dragStartElementPos.current.x + deltaX;
                const finalY = dragStartElementPos.current.y + deltaY;

                // Store position in element's data attribute for persistence
                element.setAttribute('data-position', JSON.stringify({ x: finalX, y: finalY }));

                // TODO: Dispatch to Redux to save position
                console.log('Image dragged to:', { x: finalX, y: finalY, path: draggedElement.dataPath });
            } else {
                // Was a click, open editor
                setActiveEditor(draggedElement);
            }

            // Reset drag state
            setIsDragging(false);
            setDraggedElement(null);
            dragStartPos.current = null;
            dragStartElementPos.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggedElement, isDragging]);

    /**
     * Handles closing the active editor
     */
    const handleEditorClose = () => {
        setActiveEditor(null);
    };

    /**
     * Handles image change from ImageEditor
     */
    const handleImageChange = (newImageUrl: string, prompt?: string) => {
        if (activeEditor && activeEditor.element) {


            // Update the DOM element immediately for visual feedback
            (activeEditor.element as HTMLImageElement).src = newImageUrl;

            // Update Redux store
            dispatch(updateSlideImage({
                slideIndex,
                dataPath: activeEditor.dataPath,
                imageUrl: newImageUrl,
                prompt: prompt || activeEditor.data?.__image_prompt__ || ''
            }));
            setActiveEditor(null);
        }
    };
    /**
     * Handles icon change from IconsEditor
     */
    const handleIconChange = (newIconUrl: string, query?: string) => {
        console.log('newIconUrl', newIconUrl);
        if (activeEditor && activeEditor.element) {
            // Update Redux store
            dispatch(updateSlideIcon({
                slideIndex,
                dataPath: activeEditor.dataPath,
                iconUrl: newIconUrl,
                query: query || activeEditor.data?.__icon_query__ || ''
            }));



        }
    };
    const handleFocusPointClick = (propertiesData: any) => {

        const id = activeEditor?.id;
        const editableId = document.querySelector(`[data-editable-id="${id}"]`);

        if (editableId) {
            const editableElement = editableId as HTMLImageElement;
            editableElement.style.objectFit = propertiesData.initialObjectFit;
            editableElement.style.objectPosition = `${propertiesData.initialFocusPoint.x}% ${propertiesData.initialFocusPoint.y}%`;
        }

        dispatch(updateImageProperties({
            slideIndex,
            itemIndex: parseInt(activeEditor?.id.split('-').pop() || '0'),
            properties: propertiesData
        }));

    };

    return (
        <div ref={containerRef} className="editable-layout-wrapper w-full ">
            {children}

            {/* Render ImageEditor when an image is being edited */}
            {activeEditor && activeEditor.type === 'image' && (
                <ImageEditor
                    initialImage={activeEditor.src}
                    slideIndex={slideIndex}
                    promptContent={activeEditor.data?.__image_prompt__ || ''}
                    imageIdx={0}
                    properties={null}
                    onClose={handleEditorClose}
                    onImageChange={handleImageChange}
                    onFocusPointClick={handleFocusPointClick}
                >
                </ImageEditor>
            )}

            {/* Render IconsEditor when an icon is being edited */}
            {activeEditor && activeEditor.type === 'icon' && (
                <IconsEditor
                    icon_prompt={activeEditor.data?.__icon_query__ ? [activeEditor.data.__icon_query__] : []}
                    currentIconUrl={activeEditor.src}
                    onClose={handleEditorClose}
                    onIconChange={handleIconChange}
                >

                </IconsEditor>
            )}
        </div>
    );
};

export default EditableLayoutWrapper;
