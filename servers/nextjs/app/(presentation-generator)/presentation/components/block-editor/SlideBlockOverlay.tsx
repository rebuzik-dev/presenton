"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  blockTypeFromPromptType,
  buildEditableBlockId,
  EditableSlideBlock,
  MeasuredEditableBlock,
  semanticLabelForPath,
} from "../../../types/blockMap";
import BlockLabel from "./BlockLabel";

interface SlideBlockOverlayProps {
  slide: any;
  enabled: boolean;
  blocks: EditableSlideBlock[];
  selectedBlockId?: string | null;
  children: React.ReactNode;
  onBlockSelect: (block: MeasuredEditableBlock) => void;
  onMeasuredBlocksChange?: (blocks: MeasuredEditableBlock[]) => void;
  renderBlockPopover?: (block: MeasuredEditableBlock) => React.ReactNode;
}

function blockMatches(a: EditableSlideBlock, blockId: string, path: string, type: string) {
  return a.block_id === blockId || (a.schema_path === path && a.type === type);
}

export default function SlideBlockOverlay({
  slide,
  enabled,
  blocks,
  selectedBlockId,
  children,
  onBlockSelect,
  onMeasuredBlocksChange,
  renderBlockPopover,
}: SlideBlockOverlayProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [measuredBlocks, setMeasuredBlocks] = useState<MeasuredEditableBlock[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  const blockMap = useMemo(() => new Map(blocks.map((block) => [block.block_id, block])), [blocks]);

  const measureBlocks = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const frameRect = frame.getBoundingClientRect();
    if (frameRect.width <= 0 || frameRect.height <= 0) return;

    const targets = Array.from(
      frame.querySelectorAll<HTMLElement>("[data-prompt-path][data-prompt-type], [data-layout-path]")
    );
    const seen = new Set<string>();
    const measured = targets.flatMap((element): MeasuredEditableBlock[] => {
      const schemaPath = element.dataset.promptPath || element.dataset.layoutPath || "";
      if (!schemaPath) return [];

      const type = blockTypeFromPromptType(element.dataset.promptType);
      const blockId = buildEditableBlockId(slide.layout, type, schemaPath);
      if (seen.has(blockId)) return [];

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];

      const matched =
        blockMap.get(blockId) ||
        blocks.find((block) => blockMatches(block, blockId, schemaPath, type));
      seen.add(blockId);

      const baseBlock: EditableSlideBlock = matched || {
        block_id: blockId,
        slide_index: slide.index,
        layout_id: slide.layout,
        schema_path: schemaPath,
        type,
        semantic_name: element.dataset.promptName || semanticLabelForPath(schemaPath),
        description: element.dataset.promptDescription || null,
        content: {},
        prompt: { source: "generated", text: null, override_text: null },
        debug: {
          raw_path: `slides[${slide.index}].${schemaPath}`,
          component: slide.layout,
          template_slug: slide.layout_group,
        },
      };

      return [{
        ...baseBlock,
        semantic_name: element.dataset.promptName || baseBlock.semantic_name,
        description: element.dataset.promptDescription || baseBlock.description,
        rect: {
          left: ((rect.left - frameRect.left) / frameRect.width) * 100,
          top: ((rect.top - frameRect.top) / frameRect.height) * 100,
          width: (rect.width / frameRect.width) * 100,
          height: (rect.height / frameRect.height) * 100,
        },
      }];
    });

    const withDensity = measured.map((block) => ({
      ...block,
      isDense: measured.length > 8,
    }));
    setMeasuredBlocks(withDensity);
    onMeasuredBlocksChange?.(withDensity);
  }, [blockMap, blocks, onMeasuredBlocksChange, slide.index, slide.layout, slide.layout_group]);

  useEffect(() => {
    measureBlocks();
    const frame = frameRef.current;
    if (!frame) return undefined;

    const resizeObserver = new ResizeObserver(measureBlocks);
    resizeObserver.observe(frame);
    const mutationObserver = new MutationObserver(measureBlocks);
    mutationObserver.observe(frame, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener("resize", measureBlocks);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measureBlocks);
    };
  }, [measureBlocks, children]);

  return (
    <div ref={frameRef} className="relative h-full w-full" data-block-edit-frame={slide.index}>
      {children}
      {enabled && (
        <div className="pointer-events-none absolute inset-0">
          {measuredBlocks.map((block) => {
            const selected = selectedBlockId === block.block_id;
            const hovered = hoveredBlockId === block.block_id;
            const labelVisible = selected || hovered || !block.isDense;

            return (
              <Popover key={block.block_id}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Edit block ${block.semantic_name}`}
                    className={cn(
                      "pointer-events-auto absolute rounded-md border-2 bg-cyan-300/10 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
                      selected
                        ? "border-purple-500 bg-purple-500/15 shadow-[0_0_0_3px_rgba(122,90,248,0.22)]"
                        : "border-cyan-400/70 hover:border-purple-500 hover:bg-purple-500/10"
                    )}
                    style={{
                      left: `${block.rect.left}%`,
                      top: `${block.rect.top}%`,
                      width: `${block.rect.width}%`,
                      height: `${block.rect.height}%`,
                    }}
                    onMouseEnter={() => setHoveredBlockId(block.block_id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                    onFocus={() => setHoveredBlockId(block.block_id)}
                    onBlur={() => setHoveredBlockId(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onBlockSelect(block);
                    }}
                  >
                    <BlockLabel block={block} visible={labelVisible} />
                  </button>
                </PopoverTrigger>
                {renderBlockPopover && (
                  <PopoverContent align="start" side="right" sideOffset={10} className="w-auto p-3">
                    {renderBlockPopover(block)}
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      )}
    </div>
  );
}
