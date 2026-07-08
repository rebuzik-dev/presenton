"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AnchoredBlockPromptPopoverProps {
  title: string;
  type: string;
  path?: string | null;
  source?: string | null;
  override?: string | null;
  disabled?: boolean;
  saving?: boolean;
  onSave: (value: string) => Promise<void> | void;
  onReset: () => Promise<void> | void;
}

export default function AnchoredBlockPromptPopover({
  title,
  type,
  path,
  source,
  override,
  disabled,
  saving,
  onSave,
  onReset,
}: AnchoredBlockPromptPopoverProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(override || source || "");
  }, [override, source]);

  const hasOverride = !!override?.trim();
  const sourceLabel = useMemo(() => (hasOverride ? "override" : "source"), [hasOverride]);
  const isDirty = draft.trim() !== (override || source || "").trim();

  return (
    <div className="flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          {path && <div className="truncate font-mono text-[11px] text-muted-foreground">{path}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="rounded-full">
            {type}
          </Badge>
          <Badge variant={hasOverride ? "default" : "outline"} className="rounded-full">
            {sourceLabel}
          </Badge>
        </div>
      </div>

      {source !== undefined && (
        <div className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Source prompt</div>
          <div className="max-h-20 overflow-auto whitespace-pre-wrap">{source || "No source prompt found."}</div>
        </div>
      )}

      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-[118px] resize-none text-sm"
        placeholder="Prompt override for this block"
        disabled={disabled || saving}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onReset()}
          disabled={disabled || saving || !hasOverride}
        >
          <RotateCcw data-icon="inline-start" />
          Reset override
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            <WandSparkles data-icon="inline-start" />
            Block regeneration coming next
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(draft)}
            disabled={disabled || saving || !isDirty}
          >
            <Save data-icon="inline-start" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
