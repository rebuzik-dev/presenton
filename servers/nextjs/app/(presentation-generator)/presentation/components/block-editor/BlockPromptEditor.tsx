"use client";

import React from "react";
import { RotateCcw, Save, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface BlockPromptEditorProps {
  source: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}

export default function BlockPromptEditor({
  source,
  value,
  disabled,
  onChange,
  onReset,
  onSave,
}: BlockPromptEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="rounded-full">
          {source}
        </Badge>
        <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={disabled}>
          <RotateCcw data-icon="inline-start" />
          Сбросить override
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[160px] resize-none text-sm"
        placeholder="Prompt для выбранного блока"
        disabled={disabled}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled>
          <WandSparkles data-icon="inline-start" />
          Запустить регенерацию блока
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={disabled}>
          <Save data-icon="inline-start" />
          Сохранить
        </Button>
      </div>
    </div>
  );
}
