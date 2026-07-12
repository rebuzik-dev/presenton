"use client";

import React, { ReactNode, useLayoutEffect, useRef } from "react";

import { findBestSlideMediaPath } from "../utils/slideMedia";

interface ImageFocusPoint {
  x?: number;
  y?: number;
}

interface ImageLayoutProperty {
  initialObjectFit?: "cover" | "contain" | "fill";
  initialFocusPoint?: ImageFocusPoint;
}

interface SlideMediaLayoutProps {
  children: ReactNode;
  slideData: unknown;
  slideIndex: number;
  properties?: Record<string | number, ImageLayoutProperty> | null;
}

function restoreStyle(element: HTMLElement, originalStyle: string | null): void {
  if (originalStyle === null) {
    element.removeAttribute("style");
  } else {
    element.setAttribute("style", originalStyle);
  }
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Keeps schema-backed slide images in the same crop boxes in editor, preview,
 * presentation and export modes. Decorative images and theme logos are ignored.
 */
export default function SlideMediaLayout({
  children,
  slideData,
  slideIndex,
  properties,
}: SlideMediaLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalImageStyles = new Map<HTMLImageElement, string | null>();
    const originalParentStyles = new Map<HTMLElement, string | null>();

    const normalizeImages = () => {
      container.dataset.slideRenderState = "normalizing";
      let normalizedCount = 0;

      const images = Array.from(container.querySelectorAll("img"));
      images.forEach((image, imageIndex) => {
        const match = findBestSlideMediaPath(
          image.src,
          image,
          slideData,
          container,
        );
        if (!match || match.type !== "image") return;

        const parent = image.parentElement;
        if (!parent) return;

        if (!originalImageStyles.has(image)) {
          originalImageStyles.set(image, image.getAttribute("style"));
        }
        if (!originalParentStyles.has(parent)) {
          originalParentStyles.set(parent, parent.getAttribute("style"));
        }

        if (window.getComputedStyle(parent).position === "static") {
          parent.style.position = "relative";
        }
        parent.style.minWidth = "0px";
        parent.style.minHeight = "0px";

        image.style.position = "absolute";
        image.style.inset = "0px";
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.maxWidth = "100%";
        image.style.maxHeight = "100%";

        const imageProperty = properties?.[imageIndex];
        if (imageProperty?.initialObjectFit) {
          image.style.objectFit = imageProperty.initialObjectFit;
        }
        const focusPoint = imageProperty?.initialFocusPoint;
        if (
          isFiniteCoordinate(focusPoint?.x) &&
          isFiniteCoordinate(focusPoint?.y)
        ) {
          image.style.objectPosition = `${focusPoint.x}% ${focusPoint.y}%`;
        }

        image.dataset.slideMediaNormalized = "true";
        image.dataset.slideMediaPath = match.path;
        normalizedCount += 1;
      });

      container.dataset.normalizedImageCount = String(normalizedCount);
      container.dataset.slideRenderState = "ready";
    };

    normalizeImages();
    const observer = new MutationObserver((mutations) => {
      const mediaChanged = mutations.some((mutation) => {
        if (mutation.type === "attributes") return mutation.attributeName === "src";
        return Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            ((node as Element).matches("img") || Boolean((node as Element).querySelector("img"))),
        );
      });
      if (mediaChanged) normalizeImages();
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["src"],
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      originalImageStyles.forEach((style, image) => {
        restoreStyle(image, style);
        delete image.dataset.slideMediaNormalized;
        delete image.dataset.slideMediaPath;
      });
      originalParentStyles.forEach((style, parent) => restoreStyle(parent, style));
    };
  }, [properties, slideData]);

  return (
    <div
      ref={containerRef}
      className="slide-media-layout relative h-full min-h-0 w-full min-w-0"
      data-slide-index={slideIndex}
      data-slide-render-state="pending"
    >
      {children}
    </div>
  );
}
