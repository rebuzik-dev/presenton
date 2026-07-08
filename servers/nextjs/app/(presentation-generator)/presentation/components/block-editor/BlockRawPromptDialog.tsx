"use client";

import React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { EditableSlideBlock } from "../../../types/blockMap";

interface BlockRawPromptDialogProps {
  open: boolean;
  block: EditableSlideBlock | null;
  onOpenChange: (open: boolean) => void;
}

export default function BlockRawPromptDialog({
  open,
  block,
  onOpenChange,
}: BlockRawPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raw prompt/debug payload</DialogTitle>
          <DialogDescription>
            Technical data for the selected block.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
          {JSON.stringify(block, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
