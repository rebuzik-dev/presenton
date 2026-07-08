"use client";

import React from "react";
import { MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BlockEditModeToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function BlockEditModeToggle({
  enabled,
  disabled,
  onToggle,
}: BlockEditModeToggleProps) {
  return (
    <Button
      type="button"
      variant={enabled ? "secondary" : "ghost"}
      className={enabled ? "font-bold text-[#5146E5]" : "font-bold text-white"}
      disabled={disabled}
      onClick={onToggle}
    >
      <MousePointer2 data-icon="inline-start" />
      Редактировать блоки
    </Button>
  );
}
