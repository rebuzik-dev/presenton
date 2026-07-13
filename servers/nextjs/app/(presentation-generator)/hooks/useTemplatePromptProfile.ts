import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import TemplateService, { TemplatePromptConflictError } from "../services/api/template";

export interface FieldSummary {
    path: string;
    type: string;
    required: boolean;
    description: string | null;
    default?: unknown;
    special_kind?: string | null;
}

export interface LayoutSummary {
    index: number;
    layout_id: string;
    layout_name: string | null;
    layout_description: string | null;
    source_file: string | null;
    fields_summary: FieldSummary[];
    content_slots: {
        image_slots: number;
        icon_slots: number;
        array_slots: unknown[];
    };
}

export interface LayoutPromptOverrides {
    layout_prompt?: string;
    field_prompts?: Record<string, string>;
    image_prompt_overrides?: Record<string, string>;
}

export interface PromptProfile {
    id: string | null;
    template_slug: string | null;
    template_id: string | null;
    is_active: boolean;
    template_prompt: string | null;
    layout_prompts: Record<string, LayoutPromptOverrides>;
    created_at: string | null;
    updated_at: string | null;
}

export interface TemplatePromptProfileResponse {
    template: string;
    template_id: string | null;
    template_name: string | null;
    template_type: "built-in" | "custom" | "legacy";
    source_prompt: string | null;
    revision: {
        fingerprint: string;
        updated_at: string | null;
    };
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

export function useTemplatePromptProfile(slug: string) {
    const [data, setData] = useState<TemplatePromptProfileResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!slug) {
            setData(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await TemplateService.getTemplatePromptProfile(slug);
            setData(response);
            setError(null);
        } catch (err: unknown) {
            console.error("Failed to load template prompt profile:", err);
            setError(err instanceof Error ? err : new Error("Failed to load template prompt profile"));
            toast.error("Failed to load prompt profile");
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateOverride = useCallback(async (
        layoutId: string,
        type: "layout" | "field" | "image",
        path?: string,
        value?: string | null
    ) => {
        if (!slug || !data) return;

        try {
            setSaving(true);

            // Clone layout prompts
            const currentProfile = data.prompt_profile;
            const currentLayoutPrompts = currentProfile?.layout_prompts || {};

            // Deep clone layout_prompts
            const clonedLayoutPrompts: NonNullable<PromptProfile["layout_prompts"]> = JSON.parse(JSON.stringify(currentLayoutPrompts));

            if (!clonedLayoutPrompts[layoutId]) {
                clonedLayoutPrompts[layoutId] = {};
            }

            const lp = clonedLayoutPrompts[layoutId];

            const trimmedVal = value ? value.trim() : "";

            if (type === "layout") {
                if (!trimmedVal) {
                    delete lp.layout_prompt;
                } else {
                    lp.layout_prompt = trimmedVal;
                }
            } else if (type === "field") {
                if (!path) return;
                if (!lp.field_prompts) {
                    lp.field_prompts = {};
                }
                if (!trimmedVal) {
                    delete lp.field_prompts[path];
                } else {
                    lp.field_prompts[path] = trimmedVal;
                }
                if (Object.keys(lp.field_prompts).length === 0) {
                    delete lp.field_prompts;
                }
            } else if (type === "image") {
                if (!path) return;
                if (!lp.image_prompt_overrides) {
                    lp.image_prompt_overrides = {};
                }
                if (!trimmedVal) {
                    delete lp.image_prompt_overrides[path];
                } else {
                    lp.image_prompt_overrides[path] = trimmedVal;
                }
                if (Object.keys(lp.image_prompt_overrides).length === 0) {
                    delete lp.image_prompt_overrides;
                }
            }

            // Prune empty layout object
            if (Object.keys(lp).length === 0) {
                delete clonedLayoutPrompts[layoutId];
            }

            const payload = {
                template_prompt: currentProfile?.template_prompt || null,
                layout_prompts: clonedLayoutPrompts,
                expected_fingerprint: data.revision.fingerprint,
            };

            const response = await TemplateService.updateTemplatePromptProfile(slug, payload);
            setData(response);
            toast.success(trimmedVal ? "Override saved successfully" : "Override reset successfully");
            return response;
        } catch (err: unknown) {
            console.error("Failed to update override:", err);
            if (err instanceof TemplatePromptConflictError) {
                await fetchProfile();
                toast.error(err.message);
            } else {
                toast.error("Failed to save prompt override");
            }
            throw err;
        } finally {
            setSaving(false);
        }
    }, [slug, data, fetchProfile]);

    return {
        data,
        loading,
        saving,
        error,
        refetch: fetchProfile,
        updateOverride,
    };
}
