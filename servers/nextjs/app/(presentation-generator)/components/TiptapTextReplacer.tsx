"use client";

import React, { useRef, useEffect, useState, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import TiptapText from "./TiptapText";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Underline from "@tiptap/extension-underline";

const extensions = [StarterKit, Markdown, Underline];
const GLOBAL_SCALE_KEY = "__all__";

interface TiptapTextReplacerProps {
  children: ReactNode;
  slideData?: any;
  slideIndex?: number;
  layoutValidationBlocks?: Record<string, { fontScale?: number }>;
  onContentChange?: (
    content: string,
    path: string,
    slideIndex?: number
  ) => void;
  isEditable?: boolean;
}

const TiptapTextReplacer: React.FC<TiptapTextReplacerProps> = ({
  children,
  slideData,
  slideIndex,
  layoutValidationBlocks = {},
  onContentChange = () => { },
  isEditable = true,
}) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const [processedElements, setProcessedElements] = useState(
    new Set<HTMLElement>()
  );
  // Track created React roots to update content when slideData changes
  const rootsRef = useRef<
    Map<
      HTMLElement,
      {
        root: any;
        dataPath: string;
        fallbackText: string;
        baseFontSize: number | null;
      }
    >
  >(new Map());

  const applyLayoutValidationBlock = (
    container: HTMLElement,
    dataPath: string,
    baseFontSize: number | null
  ) => {
    const block =
      layoutValidationBlocks[GLOBAL_SCALE_KEY] ||
      (dataPath ? layoutValidationBlocks[dataPath] : undefined);
    const scale = block?.fontScale;

    if (!scale || scale >= 1 || !baseFontSize || !Number.isFinite(baseFontSize)) {
      return;
    }

    const scaledSize = Math.max(8, baseFontSize * scale);
    container.style.fontSize = `${scaledSize}px`;
  };

  // Effect to update editable state of existing roots
  useEffect(() => {
    if (!rootsRef.current || rootsRef.current.size === 0) return;
    rootsRef.current.forEach(
      ({ root, dataPath, fallbackText, baseFontSize }, containerEl) => {
        applyLayoutValidationBlock(containerEl, dataPath, baseFontSize);
        const content = dataPath
          ? getValueByPath(slideData, dataPath) ?? fallbackText
          : fallbackText;
        root.render(
          <TiptapText
            content={content}
            onContentChange={(newContent: string) => {
              if (dataPath && onContentChange) {
                onContentChange(newContent, dataPath, slideIndex);
              }
            }}
            isEditable={isEditable}
            placeholder="Enter text..."
          />
        );
      }
    );
  }, [isEditable, slideData, slideIndex, layoutValidationBlocks]);


  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.setAttribute("data-tiptap-processed", "false");

    const replaceTextElements = () => {
      // Get all elements in the container
      const allElements = container.querySelectorAll("*");

      allElements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;

        // Skip if already processed
        if (
          processedElements.has(htmlElement) ||
          htmlElement.classList.contains("tiptap-text-editor") ||
          htmlElement.closest(".tiptap-text-editor")
        ) {
          return;
        }

        // console.log("htmlElement", htmlElement);
        // Skip if element is inside an ignored element tree
        if (isInIgnoredElementTree(htmlElement)) return;

        // Get direct text content (not from child elements)
        const directTextContent = getDirectTextContent(htmlElement);
        const trimmedText = directTextContent.trim();

        // Check if element has meaningful text content
        if (!trimmedText || trimmedText.length <= 2) return;

        // Skip elements that contain other elements with text (to avoid double processing)
        if (hasTextChildren(htmlElement)) return;

        // Skip certain element types that shouldn't be editable
        if (shouldSkipElement(htmlElement)) return;

        // Get all computed styles to preserve them
        const allClasses = Array.from(htmlElement.classList);
        const allStyles = htmlElement.getAttribute("style");

        const dataPath = findDataPath(slideData, trimmedText);
        const dataPathValue = dataPath.path || "";
        const layoutPath = dataPathValue || `__dom_${index}`;

        // Create a container for the TiptapText
        const tiptapContainer = document.createElement("div");
        tiptapContainer.style.cssText = allStyles || "";
        tiptapContainer.className = Array.from(allClasses).join(" ");
        tiptapContainer.setAttribute("data-layout-path", layoutPath);

        // Replace the element
        if (htmlElement.parentNode) {
          htmlElement.parentNode.replaceChild(tiptapContainer, htmlElement);
          // Mark as processed
          htmlElement.innerHTML = "";
        }
        setProcessedElements((prev) => new Set(prev).add(htmlElement));
        const computedFontSize = Number.parseFloat(
          window.getComputedStyle(htmlElement).fontSize
        );
        const baseFontSize =
          Number.isFinite(computedFontSize) && computedFontSize > 0
            ? computedFontSize
            : null;
        if (baseFontSize) {
          tiptapContainer.setAttribute(
            "data-layout-base-font-size",
            String(baseFontSize)
          );
        }
        applyLayoutValidationBlock(
          tiptapContainer,
          dataPathValue,
          baseFontSize
        );
        // Render TiptapText
        const root = ReactDOM.createRoot(tiptapContainer);
        const initialContent = dataPathValue
          ? getValueByPath(slideData, dataPathValue) ?? trimmedText
          : trimmedText;
        rootsRef.current.set(tiptapContainer, {
          root,
          dataPath: dataPathValue,
          fallbackText: trimmedText,
          baseFontSize,
        });
        root.render(
          <TiptapText
            content={initialContent}
            onContentChange={(content: string) => {
              if (dataPath && onContentChange) {
                onContentChange(content, dataPathValue, slideIndex);
              }
            }}
            placeholder="Enter text..."
            isEditable={isEditable}
          />
        );
      });

      container.setAttribute("data-tiptap-processed", "true");
    };

    // Replace text elements after a short delay to ensure DOM is ready
    // Reduced from 1000ms to 50ms to minimize flash of unstyled markdown
    const timer = setTimeout(replaceTextElements, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [slideData, slideIndex, layoutValidationBlocks]); // Dependencies (isEditable intentionally omitted from this effect to avoid re-creation, handled by separate effect)

  // When slideData changes, update existing editors' content using the stored dataPath
  // (Merged into the isEditable effect above for efficiency)

  // helper functions
  // Function to check if element is inside an ignored element tree
  const isInIgnoredElementTree = (element: HTMLElement): boolean => {
    // List of element types that should be ignored entirely with all their children
    const ignoredElementTypes = [
      "TABLE",
      "TBODY",
      "THEAD",
      "TFOOT",
      "TR",
      "TD",
      "TH", // Table elements
      "SVG",
      "G",
      "PATH",
      "CIRCLE",
      "RECT",
      "LINE", // SVG elements
      "CANVAS", // Canvas element
      "VIDEO",
      "AUDIO", // Media elements
      "IFRAME",
      "EMBED",
      "OBJECT", // Embedded content
      "SELECT",
      "OPTION",
      "OPTGROUP", // Select dropdown elements
      "SCRIPT",
      "STYLE",
      "NOSCRIPT", // Script/style elements
    ];

    // List of class patterns that indicate ignored element trees
    const ignoredClassPatterns = [
      "chart",
      "graph",
      "visualization", // Chart/graph components
      "menu",
      "dropdown",
      "tooltip", // UI components
      "editor",
      "wysiwyg", // Editor components
      "calendar",
      "datepicker", // Date picker components
      "slider",
      "carousel",
      "flowchart",
      "mermaid",
      "diagram",
    ];

    // Check if current element or any parent is in ignored list
    let currentElement: HTMLElement | null = element;
    while (currentElement) {
      // Check element type
      if (ignoredElementTypes.includes(currentElement.tagName)) {
        return true;
      }

      // Check class patterns
      const className =
        currentElement.className.length > 0
          ? currentElement.className.toLowerCase()
          : "";
      if (
        ignoredClassPatterns.some((pattern) => className.includes(pattern))
      ) {
        return true;
      }
      if (currentElement.id.includes("mermaid")) {
        return true;
      }

      // Check for specific attributes that indicate non-text content
      if (
        currentElement.hasAttribute("contenteditable") ||
        currentElement.hasAttribute("data-chart") ||
        currentElement.hasAttribute("data-visualization") ||
        currentElement.hasAttribute("data-interactive")
      ) {
        return true;
      }

      currentElement = currentElement.parentElement;
    }
    return false;
  };

  // Resolve nested values by path like "a.b[0].c"
  const getValueByPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    const tokens = path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".")
      .filter(Boolean);
    let current: any = obj;
    for (const token of tokens) {
      if (current == null) return undefined;
      current = current[token as keyof typeof current];
    }
    return current;
  };

  // Helper function to get only direct text content (not from children)
  const getDirectTextContent = (element: HTMLElement): string => {
    let text = "";
    const childNodes = Array.from(element.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || "";
      }
    }
    return text;
  };

  // Helper function to check if element has child elements with text
  const hasTextChildren = (element: HTMLElement): boolean => {
    const children = Array.from(element.children) as HTMLElement[];
    return children.some((child) => {
      const childText = getDirectTextContent(child).trim();
      return childText.length > 1;
    });
  };

  // Helper function to determine if element should be skipped
  const shouldSkipElement = (element: HTMLElement): boolean => {
    // Skip form elements
    if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName)) {
      return true;
    }

    // Skip elements with certain roles or types
    if (
      element.hasAttribute("role") ||
      element.hasAttribute("aria-label") ||
      element.hasAttribute("data-testid")
    ) {
      return true;
    }

    // Skip elements that contain interactive content (simplified since we now use isInIgnoredElementTree)
    if (
      element.querySelector(
        "img, svg, button, input, textarea, select, a[href]"
      )
    ) {
      return true;
    }

    // Skip container elements (elements that primarily serve as layout containers)
    const containerClasses = [
      "grid",
      "flex",
      "space-",
      "gap-",
      "container",
      "wrapper",
    ];
    const hasContainerClass = containerClasses.some((cls) =>
      element.className.length > 0 ? element.className.includes(cls) : false
    );
    if (hasContainerClass) return true;

    // Skip very short text that might be UI elements
    const text = getDirectTextContent(element).trim();
    if (text.length < 2) return true;

    // Skip elements that look like numbers or single characters (might be icons/UI)
    // if (/^[0-9]+$/.test(text) || text.length === 1) return true;
    if (text.length < 3) return true;

    return false;
  };

  // Helper function to find data path for text content
  const findDataPath = (
    data: any,
    targetText: string,
    path = ""
  ): {
    path: string;
    originalText: string;
  } => {
    if (!data || typeof data !== "object")
      return { path: "", originalText: "" };

    for (const [key, value] of Object.entries(data)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === "string" && value.trim() === targetText.trim()) {
        return { path: currentPath, originalText: value };
      }

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const result = findDataPath(
            value[i],
            targetText,
            `${currentPath}[${i}]`
          );
          if (result.path) return result;
        }
      } else if (typeof value === "object" && value !== null) {
        const result = findDataPath(value, targetText, currentPath);
        if (result.path) return result;
      }
    }
    return { path: "", originalText: "" };
  };


  return (
    <div ref={containerRef} className="tiptap-text-replacer" style={{ animation: 'fadeIn 0.2s ease-in' }}>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }
      `}</style>
      {children}
    </div>
  );
};

export default TiptapTextReplacer;
