"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowLeft,
    Save,
    RotateCcw,
    Sparkles,
    Image as ImageIcon,
    FileText,
    Layout,
    Info,
    AlertCircle,
    Search,
    X,
    Eye
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";

import TemplateService from "../services/api/template";

interface FieldSummary {
    path: string;
    type: string;
    required: boolean;
    description: string | null;
    default?: any;
    special_kind?: string | null;
}

interface LayoutSummary {
    index: number;
    layout_id: string;
    layout_name: string | null;
    layout_description: string | null;
    source_file: string | null;
    fields_summary: FieldSummary[];
    content_slots: {
        image_slots: number;
        icon_slots: number;
        array_slots: any[];
    };
}

interface PromptProfile {
    id: string | null;
    template_slug: string | null;
    template_id: string | null;
    is_active: boolean;
    template_prompt: string | null;
    layout_prompts: Record<string, {
        layout_prompt?: string;
        field_prompts?: Record<string, string>;
        image_prompt_overrides?: Record<string, string>;
    }>;
    created_at: string | null;
    updated_at: string | null;
}

interface TemplatePromptProfileResponse {
    template: string;
    template_id: string | null;
    template_name: string | null;
    template_type: "built-in" | "custom" | "legacy";
    source_prompt: string | null;
    prompt_profile: PromptProfile | null;
    schema_summary: {
        template: string;
        ordered: boolean;
        layout_count: number;
        layouts: LayoutSummary[];
    };
    image_summary?: {
        template: string;
        ordered: boolean;
        total_image_prompt_slots: number;
        slides: Array<{
            index: number;
            layout_id: string;
            layout_name: string | null;
            slide_description: string;
            image_prompt_slots: number;
            image_prompts: string[];
        }>;
    };
}

interface TemplatePromptEditorPanelProps {
    slug: string;
    initialLayoutId?: string;
    compact?: boolean;
    onSaveSuccess?: () => void;
    onClose?: () => void;
}

export default function TemplatePromptEditorPanel({
    slug,
    initialLayoutId,
    compact = false,
    onSaveSuccess,
    onClose
}: TemplatePromptEditorPanelProps) {
    const router = useRouter();

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [data, setData] = useState<TemplatePromptProfileResponse | null>(null);

    // Prompt state
    const [templatePrompt, setTemplatePrompt] = useState<string>("");
    const [layoutPrompts, setLayoutPrompts] = useState<Record<string, {
        layout_prompt?: string;
        field_prompts?: Record<string, string>;
        image_prompt_overrides?: Record<string, string>;
    }>>({});

    // Filter layouts state
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Refs for scrolling to focused layout
    const layoutRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const fetchProfile = async () => {
        if (!slug) return;
        try {
            setLoading(true);
            const response = await TemplateService.getTemplatePromptProfile(slug);
            setData(response);

            // Initialize states
            const profile = response.prompt_profile;
            setTemplatePrompt(profile?.template_prompt || "");
            setLayoutPrompts(profile?.layout_prompts || {});
        } catch (error) {
            console.error("Failed to load prompt profile:", error);
            toast.error("Failed to load template prompt profile settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [slug]);

    // Save configuration
    const handleSave = async () => {
        if (!slug) return;
        try {
            setSaving(true);

            // Deep clean and prune empty or useless entries
            const prunedLayoutPrompts: Record<string, any> = {};

            for (const layoutId in layoutPrompts) {
                const lp = layoutPrompts[layoutId];
                if (!lp) continue;

                const cleanLp: any = {};

                if (lp.layout_prompt && lp.layout_prompt.trim() !== "") {
                    cleanLp.layout_prompt = lp.layout_prompt.trim();
                }

                // Prune field prompt overrides
                if (lp.field_prompts) {
                    const cleanFieldPrompts: Record<string, string> = {};
                    for (const key in lp.field_prompts) {
                        const val = lp.field_prompts[key];
                        if (val && val.trim() !== "") {
                            cleanFieldPrompts[key] = val.trim();
                        }
                    }
                    if (Object.keys(cleanFieldPrompts).length > 0) {
                        cleanLp.field_prompts = cleanFieldPrompts;
                    }
                }

                // Prune image prompt overrides
                if (lp.image_prompt_overrides) {
                    const cleanImgOverrides: Record<string, string> = {};
                    for (const key in lp.image_prompt_overrides) {
                        const val = lp.image_prompt_overrides[key];
                        if (val && val.trim() !== "") {
                            cleanImgOverrides[key] = val.trim();
                        }
                    }
                    if (Object.keys(cleanImgOverrides).length > 0) {
                        cleanLp.image_prompt_overrides = cleanImgOverrides;
                    }
                }

                if (Object.keys(cleanLp).length > 0) {
                    prunedLayoutPrompts[layoutId] = cleanLp;
                }
            }

            const payload = {
                template_prompt: templatePrompt && templatePrompt.trim() !== "" ? templatePrompt.trim() : null,
                layout_prompts: prunedLayoutPrompts,
            };

            const response = await TemplateService.updateTemplatePromptProfile(slug, payload);
            setData(response);

            const updatedProfile = response.prompt_profile;
            setTemplatePrompt(updatedProfile?.template_prompt || "");
            setLayoutPrompts(updatedProfile?.layout_prompts || {});

            toast.success("Prompt overrides successfully saved");
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            console.error("Failed to save overrides:", error);
            toast.error("Failed to save prompt overrides");
        } finally {
            setSaving(false);
        }
    };

    const handleResetAll = () => {
        if (window.confirm("Are you sure you want to clear all overrides? Unsaved changes will be lost.")) {
            setTemplatePrompt("");
            setLayoutPrompts({});
            toast.success("Cleared all prompt overrides locally. Click Save to persist changes.");
        }
    };

    // Helper handlers to modify layout prompts state
    const updateLayoutPrompt = (layoutId: string, value: string) => {
        setLayoutPrompts(prev => ({
            ...prev,
            [layoutId]: {
                ...prev[layoutId],
                layout_prompt: value
            }
        }));
    };

    const updateFieldPrompt = (layoutId: string, path: string, value: string) => {
        setLayoutPrompts(prev => {
            const layout = prev[layoutId] || {};
            const fieldPrompts = layout.field_prompts || {};
            return {
                ...prev,
                [layoutId]: {
                    ...layout,
                    field_prompts: {
                        ...fieldPrompts,
                        [path]: value
                    }
                }
            };
        });
    };

    const updateImagePromptOverride = (layoutId: string, path: string, value: string) => {
        setLayoutPrompts(prev => {
            const layout = prev[layoutId] || {};
            const imgOverrides = layout.image_prompt_overrides || {};
            return {
                ...prev,
                [layoutId]: {
                    ...layout,
                    image_prompt_overrides: {
                        ...imgOverrides,
                        [path]: value
                    }
                }
            };
        });
    };

    const clearFieldPrompt = (layoutId: string, path: string) => {
        setLayoutPrompts(prev => {
            const layout = prev[layoutId] || {};
            const fieldPrompts = { ...(layout.field_prompts || {}) };
            delete fieldPrompts[path];
            return {
                ...prev,
                [layoutId]: {
                    ...layout,
                    field_prompts: fieldPrompts
                }
            };
        });
    };

    const clearImagePromptOverride = (layoutId: string, path: string) => {
        setLayoutPrompts(prev => {
            const layout = prev[layoutId] || {};
            const imgOverrides = { ...(layout.image_prompt_overrides || {}) };
            delete imgOverrides[path];
            return {
                ...prev,
                [layoutId]: {
                    ...layout,
                    image_prompt_overrides: imgOverrides
                }
            };
        });
    };

    // Filter layouts based on search query
    const filteredLayouts = useMemo(() => {
        if (!data?.schema_summary?.layouts) return [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return data.schema_summary.layouts;
        return data.schema_summary.layouts.filter(
            (layout) =>
                layout.layout_name?.toLowerCase().includes(query) ||
                layout.layout_id.toLowerCase().includes(query)
        );
    }, [data, searchQuery]);

    // Count layout specific overrides
    const getOverrideCounts = (layoutId: string) => {
        const lp = layoutPrompts[layoutId];
        if (!lp) return 0;
        let count = 0;
        if (lp.layout_prompt && lp.layout_prompt.trim() !== "") count++;
        if (lp.field_prompts) {
            count += Object.values(lp.field_prompts).filter(v => v && v.trim() !== "").length;
        }
        if (lp.image_prompt_overrides) {
            count += Object.values(lp.image_prompt_overrides).filter(v => v && v.trim() !== "").length;
        }
        return count;
    };

    const getImagePromptsForLayout = (layoutId: string) => {
        const summary = data?.image_summary?.slides?.find((slide) => slide.layout_id === layoutId);
        return summary?.image_prompts || [];
    };

    // Total counts
    const totalOverrideCount = useMemo(() => {
        let count = 0;
        if (templatePrompt && templatePrompt.trim() !== "") count++;
        if (data?.schema_summary?.layouts) {
            for (const layout of data.schema_summary.layouts) {
                count += getOverrideCounts(layout.layout_id);
            }
        }
        return count;
    }, [templatePrompt, layoutPrompts, data]);

    // Match layoutId based on target parameter
    const matchedLayout = useMemo(() => {
        if (!initialLayoutId || !data?.schema_summary?.layouts) return null;
        const target = initialLayoutId.toLowerCase().trim();
        return data.schema_summary.layouts.find(layout => {
            const layoutId = layout.layout_id.toLowerCase();
            const layoutName = (layout.layout_name || "").toLowerCase();
            const sourceFile = (layout.source_file || "").toLowerCase();
            return (
                layoutId === target ||
                layoutName === target ||
                sourceFile === target ||
                sourceFile.endsWith(target) ||
                target.endsWith(sourceFile)
            );
        });
    }, [initialLayoutId, data]);

    // Scroll to the matched layout card when loaded
    useEffect(() => {
        if (matchedLayout && !loading) {
            const layoutId = matchedLayout.layout_id;
            const element = layoutRefs.current[layoutId];
            if (element) {
                const timer = setTimeout(() => {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [matchedLayout, loading]);

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-white min-h-[400px]">
                <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
                    <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                    <h3 className="text-lg font-bold text-gray-900">Loading prompt profile</h3>
                    <p className="text-xs text-gray-500">
                        Fetching schema configuration and existing overrides for template <span className="font-mono text-purple-600">{slug}</span>...
                    </p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-white min-h-[400px]">
                <div className="max-w-md text-center bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                    <h3 className="text-base font-bold text-gray-900 mb-2">Template not found</h3>
                    <p className="text-xs text-gray-500 mb-6">
                        We could not find the template prompt configuration for slug &ldquo;{slug}&rdquo;.
                    </p>
                    <Button onClick={() => router.push("/templates")} variant="outline" className="w-full">
                        Return to Templates
                    </Button>
                </div>
            </div>
        );
    }

    const typeBadgeColor = {
        "built-in": "bg-blue-50 text-blue-700 border-blue-200",
        custom: "bg-purple-50 text-purple-700 border-purple-200",
        legacy: "bg-amber-50 text-amber-700 border-amber-200",
    }[data.template_type] || "bg-gray-50 text-gray-700";

    if (compact) {
        return (
            <div className="flex flex-col h-full bg-white overflow-hidden text-gray-900">
                {/* Header (Compact) */}
                <div className="px-5 py-4 border-b border-gray-150 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 truncate">
                                Prompts: {data.template_name || data.template}
                            </h3>
                            <Badge variant="outline" className={`${typeBadgeColor} font-medium capitalize text-[10px] px-1.5 py-0.5 rounded-full shrink-0`}>
                                {data.template_type}
                            </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{data.template}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetAll}
                            disabled={saving || totalOverrideCount === 0}
                            className="h-8 px-2.5 text-xs text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Reset
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            {saving ? "Saving..." : "Save"}
                        </Button>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Body (Compact) */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {/* Read-only Alert */}
                    <div className="bg-purple-50/50 border border-purple-100/70 rounded-2xl p-3.5 flex gap-3 text-xs">
                        <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-gray-900 block mb-0.5">Template Overrides Mode</span>
                            <span className="text-gray-600 leading-relaxed">
                                Layout structure is locked. Changes apply as custom prompt instructions during generation.
                            </span>
                        </div>
                    </div>

                    {/* Template-level Prompt Card */}
                    <Card className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-none">
                        <CardHeader className="border-b border-gray-50 bg-gray-50/30 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-700" />
                                <div>
                                    <CardTitle className="text-sm font-bold text-gray-900">Template-Level Prompt Override</CardTitle>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-4">
                            {data.source_prompt && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base Prompt</Label>
                                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                                        {data.source_prompt}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="template-prompt-override" className="text-xs font-bold text-gray-800">
                                        Prompt Override
                                    </Label>
                                    {templatePrompt && (
                                        <button
                                            onClick={() => setTemplatePrompt("")}
                                            className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            Clear Override
                                        </button>
                                    )}
                                </div>
                                <Textarea
                                    id="template-prompt-override"
                                    placeholder="Enter custom instructions to override the default template-level prompt..."
                                    value={templatePrompt}
                                    onChange={(e) => setTemplatePrompt(e.target.value)}
                                    rows={4}
                                    className="rounded-xl border-gray-200 font-sans text-xs leading-relaxed"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Layouts Section Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                    <Layout className="w-4 h-4 text-gray-500" />
                                    Layout Specific Prompts
                                </h4>
                            </div>

                            <div className="relative w-44 shrink-0">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Filter layouts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-7 py-1.5 h-8 bg-white rounded-lg border-gray-200 focus:border-purple-500 text-xs font-sans"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Layouts List */}
                        {filteredLayouts.length === 0 ? (
                            <div className="bg-white border border-gray-150 rounded-2xl p-6 text-center shadow-none">
                                <p className="text-gray-800 font-bold text-xs mb-1">No matching layouts</p>
                                <p className="text-[10px] text-gray-500">Try adjusting your filter search.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredLayouts.map((layout) => {
                                    const layoutOverridesCount = getOverrideCounts(layout.layout_id);
                                    const hasLayoutPromptOverride = !!layoutPrompts[layout.layout_id]?.layout_prompt;
                                    const isFocused = matchedLayout?.layout_id === layout.layout_id;

                                    const stringFields = layout.fields_summary?.filter(
                                        f => f.type === "string" && f.special_kind !== "image_prompt"
                                    ) || [];

                                    const imagePromptFields = layout.fields_summary?.filter(
                                        f => f.special_kind === "image_prompt"
                                    ) || [];

                                    return (
                                        <div
                                            key={layout.layout_id}
                                            ref={el => { layoutRefs.current[layout.layout_id] = el; }}
                                            className={`rounded-2xl border overflow-hidden transition-all duration-300 bg-white ${
                                                isFocused
                                                    ? "border-purple-500 ring-2 ring-purple-100 shadow-md scale-[1.01]"
                                                    : "border-gray-150 hover:border-gray-300 shadow-none"
                                            }`}
                                        >
                                            {/* Layout Card Header */}
                                            <div className={`px-4 py-3 border-b flex flex-col gap-1.5 ${
                                                isFocused ? "bg-purple-50/20 border-purple-100" : "bg-gray-50/30 border-gray-100"
                                            }`}>
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                                        <span>Slide #{layout.index + 1}</span>
                                                        <span>•</span>
                                                        <span className="font-mono text-[9px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                                            {layout.layout_id}
                                                        </span>
                                                    </div>
                                                    {layoutOverridesCount > 0 && (
                                                        <Badge className="bg-purple-50 border border-purple-200 text-purple-700 text-[9px] font-semibold px-1.5 py-0 rounded-full shrink-0">
                                                            {layoutOverridesCount} custom settings
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <h5 className="text-xs font-bold text-gray-900 capitalize truncate">
                                                        {layout.layout_name || `Slide Layout ${layout.index + 1}`}
                                                    </h5>
                                                    {layout.source_file && (
                                                        <span className="text-[9px] font-mono text-gray-400 shrink-0">
                                                            {layout.source_file.split('/').pop()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Layout Card Content */}
                                            <div className="p-4 space-y-4">
                                                {layout.layout_description && (
                                                    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3 text-xs text-gray-600 leading-relaxed">
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                                            Base Description
                                                        </div>
                                                        {layout.layout_description}
                                                    </div>
                                                )}

                                                {/* Layout override */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor={`layout-prompt-${layout.layout_id}`} className="text-xs font-semibold text-gray-800">
                                                            Layout Prompt Override
                                                        </Label>
                                                        {hasLayoutPromptOverride && (
                                                            <button
                                                                onClick={() => updateLayoutPrompt(layout.layout_id, "")}
                                                                className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
                                                            >
                                                                Clear Override
                                                            </button>
                                                        )}
                                                    </div>
                                                    <Textarea
                                                        id={`layout-prompt-${layout.layout_id}`}
                                                        placeholder="Enter layout prompt override context..."
                                                        value={layoutPrompts[layout.layout_id]?.layout_prompt || ""}
                                                        onChange={(e) => updateLayoutPrompt(layout.layout_id, e.target.value)}
                                                        rows={2}
                                                        className="rounded-xl border-gray-200 text-xs font-sans"
                                                    />
                                                </div>

                                                {/* Accordions */}
                                                {(stringFields.length > 0 || imagePromptFields.length > 0) && (
                                                    <Accordion
                                                        type="single"
                                                        collapsible
                                                        defaultValue={isFocused ? "fields" : undefined}
                                                        className="w-full border border-gray-100 rounded-xl overflow-hidden"
                                                    >
                                                        {stringFields.length > 0 && (
                                                            <AccordionItem value="fields" className="border-b border-gray-100 px-3 bg-white">
                                                                <AccordionTrigger className="hover:no-underline hover:bg-gray-50/50 py-2.5 text-xs font-bold text-gray-700">
                                                                    <span className="flex items-center gap-1.5 text-left">
                                                                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        Text Fields ({stringFields.length})
                                                                    </span>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                                                    {stringFields.map((field) => {
                                                                        const hasFieldOverride = !!layoutPrompts[layout.layout_id]?.field_prompts?.[field.path];
                                                                        return (
                                                                            <div key={field.path} className="space-y-1.5 border-l-2 border-purple-200 pl-3 py-0.5">
                                                                                <div className="flex justify-between items-center">
                                                                                    <Label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                                                        <span className="font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[200px]">
                                                                                            {field.path}
                                                                                        </span>
                                                                                        {field.required && (
                                                                                            <span className="text-red-500 font-bold" title="Required">*</span>
                                                                                        )}
                                                                                    </Label>
                                                                                    {hasFieldOverride && (
                                                                                        <button
                                                                                            onClick={() => clearFieldPrompt(layout.layout_id, field.path)}
                                                                                            className="text-[9px] text-red-500 hover:text-red-700 transition-colors"
                                                                                        >
                                                                                            Clear
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                {field.description && (
                                                                                    <div className="text-[10px] text-gray-500 bg-gray-50/55 p-2 rounded-lg border border-gray-100">
                                                                                        {field.description}
                                                                                    </div>
                                                                                )}
                                                                                <Textarea
                                                                                    placeholder={`Enter override prompt for '${field.path}'...`}
                                                                                    value={layoutPrompts[layout.layout_id]?.field_prompts?.[field.path] || ""}
                                                                                    onChange={(e) => updateFieldPrompt(layout.layout_id, field.path, e.target.value)}
                                                                                    rows={2}
                                                                                    className="rounded-lg border-gray-200 text-xs font-sans"
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        )}

                                                        {imagePromptFields.length > 0 && (
                                                            <AccordionItem value="images" className="border-b-0 px-3 bg-white">
                                                                <AccordionTrigger className="hover:no-underline hover:bg-gray-50/50 py-2.5 text-xs font-bold text-gray-700">
                                                                    <span className="flex items-center gap-1.5 text-left">
                                                                        <ImageIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        Image Prompts ({imagePromptFields.length})
                                                                    </span>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                                                    {imagePromptFields.map((field) => {
                                                                        const hasImgOverride = !!layoutPrompts[layout.layout_id]?.image_prompt_overrides?.[field.path];
                                                                        const imagePromptIndex = imagePromptFields.findIndex(item => item.path === field.path);
                                                                        const sourceImagePrompt = getImagePromptsForLayout(layout.layout_id)[imagePromptIndex];
                                                                        return (
                                                                            <div key={field.path} className="space-y-1.5 border-l-2 border-indigo-200 pl-3 py-0.5">
                                                                                <div className="flex justify-between items-center">
                                                                                    <Label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                                                        <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[200px]">
                                                                                            {field.path}
                                                                                        </span>
                                                                                        {field.required && (
                                                                                            <span className="text-red-500 font-bold" title="Required">*</span>
                                                                                        )}
                                                                                    </Label>
                                                                                    {hasImgOverride && (
                                                                                        <button
                                                                                            onClick={() => clearImagePromptOverride(layout.layout_id, field.path)}
                                                                                            className="text-[9px] text-red-500 hover:text-red-700 transition-colors"
                                                                                        >
                                                                                            Clear
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                {field.description && (
                                                                                    <div className="text-[10px] text-gray-500 bg-gray-50/55 p-2 rounded-lg border border-gray-100">
                                                                                        {field.description}
                                                                                    </div>
                                                                                )}
                                                                                {sourceImagePrompt && (
                                                                                    <div className="text-[10px] text-gray-500 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                                                                        <span className="font-bold text-indigo-400 uppercase tracking-wider text-[8px] block mb-0.5">Current Prompt</span>
                                                                                        {sourceImagePrompt}
                                                                                    </div>
                                                                                )}
                                                                                <Textarea
                                                                                    placeholder={`Enter custom image prompt override guidelines for '${field.path}'...`}
                                                                                    value={layoutPrompts[layout.layout_id]?.image_prompt_overrides?.[field.path] || ""}
                                                                                    onChange={(e) => updateImagePromptOverride(layout.layout_id, field.path, e.target.value)}
                                                                                    rows={2}
                                                                                    className="rounded-lg border-gray-200 text-xs font-sans"
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        )}
                                                    </Accordion>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default Full-Page Mode (exact representation of template-prompts/[slug]/page.tsx)
    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-syne text-gray-900">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200 py-4 px-6 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/templates")}
                                className="h-8 px-2 -ml-2 text-gray-500 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Templates
                            </Button>
                            <span className="text-gray-300">/</span>
                            <span className="text-xs font-mono text-gray-400">{data.template}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 capitalize">
                                {data.template_name || data.template}
                            </h1>
                            <Badge variant="outline" className={`${typeBadgeColor} font-medium capitalize text-xs px-2.5 py-0.5 rounded-full`}>
                                {data.template_type} template
                            </Badge>
                            {totalOverrideCount > 0 && (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-transparent text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                    {totalOverrideCount} Overrides Configured
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/template-preview?slug=${encodeURIComponent(slug)}`)}
                            className="flex items-center gap-1.5 text-gray-600 border-gray-200 h-10 px-4 max-sm:flex-1"
                        >
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetAll}
                            disabled={saving || totalOverrideCount === 0}
                            className="flex items-center gap-1.5 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 h-10 px-4 max-sm:flex-1"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Reset All</span>
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white h-10 px-5 max-sm:flex-1"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? "Saving..." : "Save overrides"}</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">

                {/* Alert Warning about Read-only structure */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-5 md:p-6 flex gap-4 shadow-sm">
                    <div className="p-3 bg-purple-100/50 rounded-2xl text-purple-700 shrink-0 self-start">
                        <Info className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-base mb-1">Source Template remains Read-only</h3>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-4xl">
                            All original layouts, field definitions, and image slots are locked.
                            Your edits are saved as isolated <strong>Prompt Overrides</strong> which override the default generation rules
                            dynamically when Presenton processes this template.
                        </p>
                    </div>
                </div>

                {/* Template-level Prompt Card */}
                <Card className="rounded-[24px] border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">Template-Level Prompt Override</CardTitle>
                                <CardDescription className="text-sm text-gray-500">
                                    Specifies core context or style instructions applied to the entire presentation.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-5">
                        {data.source_prompt && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Original Base Prompt</Label>
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                                    {data.source_prompt}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="template-prompt-override" className="text-sm font-bold text-gray-800">
                                    Prompt Override
                                </Label>
                                {templatePrompt && (
                                    <button
                                        onClick={() => setTemplatePrompt("")}
                                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Clear Override
                                    </button>
                                )}
                            </div>
                            <Textarea
                                id="template-prompt-override"
                                placeholder="Enter custom instructions to override the default template-level prompt..."
                                value={templatePrompt}
                                onChange={(e) => setTemplatePrompt(e.target.value)}
                                rows={6}
                                className="rounded-2xl border-gray-200 focus:border-purple-500 focus:ring-purple-200 font-sans text-sm leading-relaxed"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Layouts Section Header */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Layout className="w-5 h-5 text-gray-500" />
                                Layout Specific Prompts
                            </h2>
                            <p className="text-sm text-gray-500">
                                Override descriptions and prompts on a slide-by-slide layout basis.
                            </p>
                        </div>

                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search layouts by name/ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white rounded-xl border-gray-200 focus:border-purple-500 text-sm font-sans"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Layouts List */}
                    {filteredLayouts.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
                            <Layout className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-800 font-bold text-base mb-1">No layouts match your criteria</p>
                            <p className="text-sm text-gray-500">Try tweaking your search term to find layouts.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredLayouts.map((layout) => {
                                const layoutOverridesCount = getOverrideCounts(layout.layout_id);
                                const hasLayoutPromptOverride = !!layoutPrompts[layout.layout_id]?.layout_prompt;
                                const isFocused = matchedLayout?.layout_id === layout.layout_id;

                                // Fields categorized
                                const stringFields = layout.fields_summary?.filter(
                                    f => f.type === "string" && f.special_kind !== "image_prompt"
                                ) || [];

                                const imagePromptFields = layout.fields_summary?.filter(
                                    f => f.special_kind === "image_prompt"
                                ) || [];

                                return (
                                    <Card
                                        key={layout.layout_id}
                                        ref={el => { layoutRefs.current[layout.layout_id] = el; }}
                                        className={`rounded-[24px] border bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-350 ${
                                            isFocused ? "border-purple-500 ring-4 ring-purple-50" : "border-gray-200"
                                        }`}
                                    >
                                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                        Layout #{layout.index + 1}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        {layout.layout_id}
                                                    </span>
                                                </div>
                                                <CardTitle className="text-base font-bold text-gray-900 capitalize">
                                                    {layout.layout_name || `Slide Layout ${layout.index + 1}`}
                                                </CardTitle>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {layoutOverridesCount > 0 && (
                                                    <Badge className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-2 rounded-full">
                                                        {layoutOverridesCount} custom settings
                                                    </Badge>
                                                )}
                                                {layout.source_file && (
                                                    <span className="text-xs font-mono text-gray-400">
                                                        Source: {layout.source_file}
                                                    </span>
                                                )}
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-6 space-y-6">
                                            {/* Original description if present */}
                                            {layout.layout_description && (
                                                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-sm text-gray-600 leading-relaxed">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                        Base Layout Description
                                                    </div>
                                                    {layout.layout_description}
                                                </div>
                                            )}

                                            {/* Layout level prompt override */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor={`layout-prompt-${layout.layout_id}`} className="text-sm font-semibold text-gray-800">
                                                        Layout-Level Prompt Override
                                                    </Label>
                                                    {hasLayoutPromptOverride && (
                                                        <button
                                                            onClick={() => updateLayoutPrompt(layout.layout_id, "")}
                                                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                                        >
                                                            Clear Override
                                                        </button>
                                                    )}
                                                </div>
                                                <Textarea
                                                    id={`layout-prompt-${layout.layout_id}`}
                                                    placeholder="Enter layout prompt override to override default instructions for this specific layout type..."
                                                    value={layoutPrompts[layout.layout_id]?.layout_prompt || ""}
                                                    onChange={(e) => updateLayoutPrompt(layout.layout_id, e.target.value)}
                                                    rows={3}
                                                    className="rounded-2xl border-gray-200 text-sm font-sans"
                                                />
                                            </div>

                                            {/* Nested fields and image slot overrides */}
                                            <Accordion
                                                type="single"
                                                collapsible
                                                defaultValue={isFocused ? "fields" : undefined}
                                                className="w-full border border-gray-100 rounded-2xl overflow-hidden"
                                            >

                                                {/* Text Fields Accordion Section */}
                                                {stringFields.length > 0 && (
                                                    <AccordionItem value="fields" className="border-b border-gray-100 px-4 bg-white">
                                                        <AccordionTrigger className="hover:no-underline hover:bg-gray-50/50 py-3 text-sm font-bold text-gray-700">
                                                            <span className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-gray-400" />
                                                                Text fields prompt overrides ({stringFields.length})
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-4 pb-6 space-y-5">
                                                            {stringFields.map((field) => {
                                                                const hasFieldOverride = !!layoutPrompts[layout.layout_id]?.field_prompts?.[field.path];
                                                                return (
                                                                    <div key={field.path} className="space-y-2 border-l-2 border-purple-200 pl-4 py-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <Label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                                                <span className="font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs">
                                                                                    {field.path}
                                                                                </span>
                                                                                {field.required && (
                                                                                    <span className="text-red-500 font-bold" title="Required field">*</span>
                                                                                )}
                                                                            </Label>
                                                                            {hasFieldOverride && (
                                                                                <button
                                                                                    onClick={() => clearFieldPrompt(layout.layout_id, field.path)}
                                                                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                                                                >
                                                                                    Clear Override
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {field.description && (
                                                                            <div className="text-xs text-gray-500 bg-gray-50/50 px-3 py-2 rounded-xl border border-gray-100">
                                                                                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">
                                                                                    Default Field Description
                                                                                </span>
                                                                                {field.description}
                                                                            </div>
                                                                        )}

                                                                        <Textarea
                                                                            placeholder={`Enter override prompt/description context for the field '${field.path}'...`}
                                                                            value={layoutPrompts[layout.layout_id]?.field_prompts?.[field.path] || ""}
                                                                            onChange={(e) => updateFieldPrompt(layout.layout_id, field.path, e.target.value)}
                                                                            rows={2}
                                                                            className="rounded-xl border-gray-200 text-sm font-sans"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )}

                                                {/* Image Prompt Overrides Accordion Section */}
                                                {imagePromptFields.length > 0 && (
                                                    <AccordionItem value="images" className="border-b-0 px-4 bg-white">
                                                        <AccordionTrigger className="hover:no-underline hover:bg-gray-50/50 py-3 text-sm font-bold text-gray-700">
                                                            <span className="flex items-center gap-2">
                                                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                                                Image prompts overrides ({imagePromptFields.length})
                                                            </span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-4 pb-6 space-y-5">
                                                            {imagePromptFields.map((field) => {
                                                                const hasImgOverride = !!layoutPrompts[layout.layout_id]?.image_prompt_overrides?.[field.path];
                                                                const imagePromptIndex = imagePromptFields.findIndex(item => item.path === field.path);
                                                                const sourceImagePrompt = getImagePromptsForLayout(layout.layout_id)[imagePromptIndex];
                                                                return (
                                                                    <div key={field.path} className="space-y-2 border-l-2 border-indigo-200 pl-4 py-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <Label className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                                                <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
                                                                                    {field.path}
                                                                                </span>
                                                                                {field.required && (
                                                                                    <span className="text-red-500 font-bold" title="Required field">*</span>
                                                                                )}
                                                                            </Label>
                                                                            {hasImgOverride && (
                                                                                <button
                                                                                    onClick={() => clearImagePromptOverride(layout.layout_id, field.path)}
                                                                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                                                                >
                                                                                    Clear Override
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {field.description && (
                                                                            <div className="text-xs text-gray-500 bg-gray-50/50 px-3 py-2 rounded-xl border border-gray-100">
                                                                                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">
                                                                                    Default Image Field Description
                                                                                </span>
                                                                                {field.description}
                                                                            </div>
                                                                        )}
                                                                        {sourceImagePrompt && (
                                                                            <div className="text-xs text-gray-500 bg-indigo-50/50 px-3 py-2 rounded-xl border border-indigo-100">
                                                                                <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] block mb-0.5">
                                                                                    Current Image Prompt
                                                                                </span>
                                                                                {sourceImagePrompt}
                                                                            </div>
                                                                        )}

                                                                        <Textarea
                                                                            placeholder={`Enter custom image prompt override guidelines for '${field.path}'...`}
                                                                            value={layoutPrompts[layout.layout_id]?.image_prompt_overrides?.[field.path] || ""}
                                                                            onChange={(e) => updateImagePromptOverride(layout.layout_id, field.path, e.target.value)}
                                                                            rows={2}
                                                                            className="rounded-xl border-gray-200 text-sm font-sans"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )}

                                            </Accordion>

                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
