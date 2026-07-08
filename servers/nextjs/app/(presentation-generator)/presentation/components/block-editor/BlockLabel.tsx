"use client";

import React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { EditableBlockType, MeasuredEditableBlock } from "../../../types/blockMap";

const TYPE_LABELS: Record<EditableBlockType, string> = {
  text: "Текст",
  image: "Изображение",
  group: "Группа",
  background: "Фон",
  decor: "Декор",
  style: "Стиль",
  layout: "Layout",
};

interface BlockLabelProps {
  block: MeasuredEditableBlock;
  visible: boolean;
}

export default function BlockLabel({ block, visible }: BlockLabelProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 top-0 max-w-[260px] translate-y-[-100%] rounded-md border bg-background/95 px-2 py-1 text-left shadow-sm transition-opacity",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[11px] font-semibold text-foreground">
          {block.semantic_name}
        </span>
        <Badge variant="outline" className="shrink-0 rounded-full px-1.5 py-0 text-[9px]">
          {TYPE_LABELS[block.type]}
        </Badge>
      </div>
      {block.description && (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
          {block.description}
        </p>
      )}
    </div>
  );
}
