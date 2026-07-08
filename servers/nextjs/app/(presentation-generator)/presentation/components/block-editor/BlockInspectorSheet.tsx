"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileJson, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  EditableBlockPatchRequest,
  MeasuredEditableBlock,
} from "../../../types/blockMap";
import BlockPromptEditor from "./BlockPromptEditor";
import BlockRawPromptDialog from "./BlockRawPromptDialog";

interface BlockInspectorSheetProps {
  open: boolean;
  block: MeasuredEditableBlock | null;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: EditableBlockPatchRequest) => Promise<void> | void;
}

const PROMPT_SOURCE_LABELS: Record<string, string> = {
  template_default: "template default",
  template_prompt_profile: "prompt profile",
  override: "override",
  generated: "generated",
};

export default function BlockInspectorSheet({
  open,
  block,
  saving,
  onOpenChange,
  onSave,
}: BlockInspectorSheetProps) {
  const [semanticName, setSemanticName] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [rawOpen, setRawOpen] = useState(false);

  useEffect(() => {
    setSemanticName(block?.semantic_name || "");
    setDescription(block?.description || "");
    setText(block?.content.text || block?.content.image_prompt || "");
    setPrompt(block?.prompt.override_text || block?.prompt.text || "");
  }, [block]);

  const sourceLabel = useMemo(
    () => PROMPT_SOURCE_LABELS[block?.prompt.source || "generated"] || "generated",
    [block?.prompt.source]
  );

  if (!block) {
    return null;
  }

  const saveMetadataAndContent = async () => {
    await onSave({
      schema_path: block.schema_path,
      semantic_name: semanticName,
      description,
      ...(block.type === "text" ? { text } : {}),
      ...(block.type === "image" ? { image_prompt_override: text } : {}),
    });
  };

  const savePrompt = async () => {
    await onSave({
      schema_path: block.schema_path,
      semantic_name: semanticName,
      description,
      ...(block.type === "image"
        ? { image_prompt_override: prompt }
        : { prompt_override: prompt }),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <SheetTitle className="text-base">{semanticName || "Блок"}</SheetTitle>
              <Badge variant="outline" className="rounded-full">
                {block.type}
              </Badge>
            </div>
            <SheetDescription>
              {description || "Описание блока не задано."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-96px)]">
            <div className="px-5 py-4">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Контент</TabsTrigger>
                  <TabsTrigger value="prompt">Промпт</TabsTrigger>
                  <TabsTrigger value="style">Стиль</TabsTrigger>
                  <TabsTrigger value="debug">Debug</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="mt-4">
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Display name
                      <Input
                        value={semanticName}
                        onChange={(event) => setSemanticName(event.target.value)}
                        disabled={saving}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Описание
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="min-h-[82px] resize-none"
                        disabled={saving}
                      />
                    </label>
                    {(block.type === "text" || block.type === "image") && (
                      <label className="flex flex-col gap-1.5 text-sm font-medium">
                        {block.type === "image" ? "Image prompt" : "Текст блока"}
                        <Textarea
                          value={text}
                          onChange={(event) => setText(event.target.value)}
                          className="min-h-[120px] resize-none"
                          disabled={saving}
                        />
                      </label>
                    )}
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={saveMetadataAndContent} disabled={saving}>
                        <Save data-icon="inline-start" />
                        Применить к этой презентации
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="prompt" className="mt-4">
                  <BlockPromptEditor
                    source={sourceLabel}
                    value={prompt}
                    disabled={saving}
                    onChange={setPrompt}
                    onReset={() => setPrompt(block.prompt.text || "")}
                    onSave={savePrompt}
                  />
                </TabsContent>

                <TabsContent value="style" className="mt-4">
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Style constraints are stored as block overrides when a style block is selected.
                    This v1 exposes text and image prompt editing first.
                  </div>
                </TabsContent>

                <TabsContent value="debug" className="mt-4">
                  <details className="rounded-md border bg-muted/30 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Technical data
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto text-xs">
                      {JSON.stringify(block.debug, null, 2)}
                    </pre>
                  </details>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setRawOpen(true)}
                  >
                    <FileJson data-icon="inline-start" />
                    Raw prompt/debug payload
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <BlockRawPromptDialog open={rawOpen} block={block} onOpenChange={setRawOpen} />
    </>
  );
}
