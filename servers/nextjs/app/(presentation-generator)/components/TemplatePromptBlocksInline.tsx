"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, FileText, Image as ImageIcon, Layout, Loader2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import InlinePromptBlockEditor from "./InlinePromptBlockEditor";
import {
    FieldSummary,
    LayoutPromptOverrides,
    LayoutSummary,
    TemplatePromptProfileResponse,
    useTemplatePromptProfile,
} from "../hooks/useTemplatePromptProfile";

type PromptBlockType = "layout" | "field" | "image";

interface PromptBlock {
    id: string;
    type: PromptBlockType;
    label: string;
    path?: string;
    sourcePrompt?: string | null;
    savedOverride?: string | null;
    disabled?: boolean;
    disabledReason?: string;
}

interface TemplatePromptBlocksInlineProps {
    slug: string;
    layoutId?: string | null;
    layoutName?: string | null;
    sourceFile?: string | null;
    index?: number;
    profileData?: TemplatePromptProfileResponse | null;
    profileLoading?: boolean;
    onUpdateOverride?: (
        layoutId: string,
        type: PromptBlockType,
        path?: string,
        value?: string | null
    ) => Promise<TemplatePromptProfileResponse | void>;
}

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

const sourceFileStem = (value?: string | null) => {
    if (!value) return "";
    const fileName = value.split("/").pop() || value;
    return fileName.replace(/\.[^.]+$/, "");
};

const fieldIsTextPrompt = (field: FieldSummary) => (
    field.type === "string" &&
    field.special_kind !== "image_prompt" &&
    field.special_kind !== "image_url" &&
    field.special_kind !== "icon_url"
);

function matchLayout(
    data: TemplatePromptProfileResponse | null | undefined,
    candidates: Array<string | null | undefined>,
    index?: number
): LayoutSummary | null {
    const layouts = data?.schema_summary?.layouts || [];
    if (!layouts.length) return null;

    const normalizedCandidates = candidates
        .flatMap((candidate) => {
            if (!candidate) return [];
            return [candidate, sourceFileStem(candidate)];
        })
        .map(normalize)
        .filter(Boolean);

    const matched = layouts.find((layout) => {
        const values = [
            layout.layout_id,
            layout.layout_name,
            layout.source_file,
            sourceFileStem(layout.source_file),
        ].map(normalize);
        return normalizedCandidates.some((candidate) => values.includes(candidate));
    });

    if (matched) return matched;
    if (typeof index === "number") {
        return layouts.find((layout) => layout.index === index) || null;
    }
    return null;
}

function getImageSummary(data: TemplatePromptProfileResponse | null | undefined, layout: LayoutSummary) {
    return data?.image_summary?.slides?.find((slide) => (
        slide.layout_id === layout.layout_id ||
        normalize(slide.layout_name) === normalize(layout.layout_name) ||
        slide.index === layout.index
    ));
}

function getLayoutPromptState(data: TemplatePromptProfileResponse, layout: LayoutSummary): LayoutPromptOverrides {
    const layoutPrompts = data.prompt_profile?.layout_prompts || {};
    const candidates = [
        layout.layout_id,
        layout.layout_id.includes(":") ? layout.layout_id.split(":", 2)[1] : null,
        layout.layout_name,
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
        const value = layoutPrompts[candidate];
        if (value) return value;
    }

    return {};
}

function buildBlocks(
    data: TemplatePromptProfileResponse | null | undefined,
    layout: LayoutSummary | null
): PromptBlock[] {
    if (!data || !layout) return [];

    const layoutPromptState = getLayoutPromptState(data, layout);
    const textFields = (layout.fields_summary || []).filter(fieldIsTextPrompt);
    const imageFields = (layout.fields_summary || []).filter((field) => field.special_kind === "image_prompt");
    const imagePrompts = getImageSummary(data, layout)?.image_prompts || [];

    const blocks: PromptBlock[] = [
        {
            id: `${layout.layout_id}:layout`,
            type: "layout",
            label: "Layout prompt",
            sourcePrompt: layout.layout_description || null,
            savedOverride: layoutPromptState.layout_prompt || null,
        },
    ];

    textFields.forEach((field) => {
        blocks.push({
            id: `${layout.layout_id}:field:${field.path}`,
            type: "field",
            label: field.path,
            path: field.path,
            sourcePrompt: field.description || null,
            savedOverride: layoutPromptState.field_prompts?.[field.path] || null,
        });
    });

    imageFields.forEach((field, imageIndex) => {
        const sourcePrompt = imagePrompts[imageIndex] || (typeof field.default === "string" ? field.default : field.description);
        blocks.push({
            id: `${layout.layout_id}:image:${field.path}`,
            type: "image",
            label: `Image prompt ${imageIndex + 1}`,
            path: field.path,
            sourcePrompt: sourcePrompt || null,
            savedOverride: layoutPromptState.image_prompt_overrides?.[field.path] || null,
        });
    });

    const imageSummary = getImageSummary(data, layout);
    const unmappedImageSlots = Math.max(
        0,
        (imageSummary?.image_prompt_slots || 0) - imageFields.length
    );
    for (let slotIndex = 0; slotIndex < unmappedImageSlots; slotIndex += 1) {
        const promptIndex = imageFields.length + slotIndex;
        blocks.push({
            id: `${layout.layout_id}:image:unmapped:${slotIndex}`,
            type: "image",
            label: `Image prompt ${promptIndex + 1}`,
            sourcePrompt: imagePrompts[promptIndex] || null,
            disabled: true,
            disabledReason: "Editable schema path is unknown for this image slot.",
        });
    }

    return blocks;
}

export default function TemplatePromptBlocksInline({
    slug,
    layoutId,
    layoutName,
    sourceFile,
    index,
    profileData,
    profileLoading,
    onUpdateOverride,
}: TemplatePromptBlocksInlineProps) {
    const ownedProfile = useTemplatePromptProfile(profileData || onUpdateOverride ? "" : slug);
    const data = profileData ?? ownedProfile.data;
    const loading = profileLoading ?? ownedProfile.loading;
    const updateOverride = onUpdateOverride ?? ownedProfile.updateOverride;
    const [openBlockId, setOpenBlockId] = useState<string | null>(null);

    const layout = useMemo(
        () => matchLayout(data, [layoutId, layoutName, sourceFile], index),
        [data, layoutId, layoutName, sourceFile, index]
    );
    const blocks = useMemo(() => buildBlocks(data, layout), [data, layout]);

    if (loading) {
        return (
            <div className="border-t border-gray-100 bg-white px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                Loading prompt blocks...
            </div>
        );
    }

    if (!data || !layout) {
        return (
            <div className="border-t border-gray-100 bg-white px-4 py-3 text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                Prompt profile is not available for this slide.
            </div>
        );
    }

    const textCount = blocks.filter((block) => block.type === "field").length;
    const imageCount = blocks.filter((block) => block.type === "image").length;
    const overriddenCount = blocks.filter((block) => block.savedOverride && block.savedOverride.trim()).length;

    const saveBlock = async (block: PromptBlock, value: string | null) => {
        await updateOverride(layout.layout_id, block.type, block.path, value);
    };

    return (
        <div className="border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Layout className="h-4 w-4 text-purple-600 shrink-0" />
                    <h4 className="text-sm font-semibold text-gray-900">Prompt blocks</h4>
                    <Badge variant="outline" className="rounded-full text-[10px] border-gray-200 text-gray-600">
                        {textCount} text
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[10px] border-gray-200 text-gray-600">
                        {imageCount} image
                    </Badge>
                    {overriddenCount > 0 && (
                        <Badge className="rounded-full text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                            {overriddenCount} overridden
                        </Badge>
                    )}
                </div>
                <span className="text-[11px] text-gray-500">
                    Overrides affect generation prompts, not slide content.
                </span>
            </div>

            <div className="space-y-2">
                {blocks.map((block) => {
                    const hasOverride = !!block.savedOverride?.trim();
                    const isOpen = openBlockId === block.id;
                    const activePrompt = hasOverride ? block.savedOverride : block.sourcePrompt;
                    const Icon = block.type === "image" ? ImageIcon : block.type === "field" ? FileText : Layout;

                    return (
                        <div
                            key={block.id}
                            className="rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Icon className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="truncate font-mono text-xs font-semibold text-gray-900">
                                            {block.label}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`rounded-full text-[10px] ${
                                                hasOverride
                                                    ? "border-purple-200 bg-purple-50 text-purple-700"
                                                    : "border-gray-200 bg-white text-gray-600"
                                            }`}
                                        >
                                            {hasOverride ? "Overridden" : "Using source"}
                                        </Badge>
                                        {block.type === "image" && (
                                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">
                                                Image prompt
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                                        {block.disabledReason || activePrompt || "No source prompt found"}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 gap-1.5 border-purple-200 bg-white text-xs text-purple-700 hover:bg-purple-50"
                                    onClick={() => setOpenBlockId(isOpen ? null : block.id)}
                                    disabled={block.disabled}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                            </div>

                            {isOpen && (
                                <InlinePromptBlockEditor
                                    label={block.path ? `${block.label} (${block.path})` : block.label}
                                    sourcePrompt={block.sourcePrompt}
                                    savedOverride={block.savedOverride}
                                    isDisabled={block.disabled}
                                    onCancel={() => setOpenBlockId(null)}
                                    onSave={async (value) => {
                                        await saveBlock(block, value);
                                    }}
                                    onReset={async () => {
                                        await saveBlock(block, null);
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
