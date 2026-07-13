import { getApiUrl } from "@/utils/api";
import { ApiResponseHandler } from "./api-error-handler";
import { getHeader } from "./header";

export interface CloneTemplatePayload {
    id: string;
    name?: string;
    description?: string;
}

export interface CloneLayoutPayload {
    template_id: string;
    layout_id: string;
    layout_name?: string;
}

export interface TemplatePromptProfilePayload {
    is_active?: boolean;
    template_prompt?: string | null;
    expected_fingerprint?: string;
    layout_prompts: Record<string, {
        layout_prompt?: string;
        field_prompts?: Record<string, string>;
        image_prompt_overrides?: Record<string, string>;
    }>;
}

export interface PromptProfileHistoryItem {
    revision_id: string;
    version: number;
    fingerprint: string;
    action: "baseline" | "update" | "restore";
    change_count: number;
    changed_layout_ids: string[];
    author: string | null;
    created_at: string;
    is_current: boolean;
    restored_from_revision_id: string | null;
}

export interface PromptProfileChange {
    scope: "template" | "layout" | "field" | "image";
    layout_id: string | null;
    path: string;
    action: "added" | "updated" | "removed";
    before: unknown;
    after: unknown;
}

export interface PromptProfileHistoryDetail extends PromptProfileHistoryItem {
    changes: PromptProfileChange[];
    snapshot: {
        is_active: boolean;
        template_prompt: string | null;
        layout_prompts: TemplatePromptProfilePayload["layout_prompts"];
    };
}

export interface PromptProfileHistoryPage {
    items: PromptProfileHistoryItem[];
    total: number;
    limit: number;
    offset: number;
}

export class TemplatePromptConflictError extends Error {
    currentFingerprint: string | null;

    constructor(currentFingerprint: string | null) {
        super("This prompt profile changed in another session. The latest version has been loaded.");
        this.name = "TemplatePromptConflictError";
        this.currentFingerprint = currentFingerprint;
    }
}

async function handlePromptProfileResponse(response: Response, defaultMessage: string) {
    if (response.status === 409) {
        let currentFingerprint: string | null = null;
        try {
            const payload = await response.json();
            currentFingerprint = payload?.detail?.current_fingerprint || null;
        } catch {
            // Keep the conflict actionable even if the response body is malformed.
        }
        throw new TemplatePromptConflictError(currentFingerprint);
    }
    return ApiResponseHandler.handleResponse(response, defaultMessage);
}

class TemplateService {

    static async getCustomTemplateSummaries() {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/template/all?include_defaults=false`), {
                credentials: "include",
            });
            return await ApiResponseHandler.handleResponse(response, "Failed to get custom template summaries");
        } catch (error) {
            console.error("Failed to get custom template summaries", error);
            throw error;
        }
    }

    static async getCustomTemplateDetails(templateId: string) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/template/${templateId}/layouts`), {
                credentials: "include",
            });
            return await ApiResponseHandler.handleResponse(response, "Failed to get custom template details");
        } catch (error) {
            console.error("Failed to get custom template details", error);
            throw error;
        }
    }

    static async deleteCustomTemplate(presentationId: string) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/template-management/delete-templates/${presentationId}`), { method: "DELETE", headers: getHeader(), credentials: "include" });
            return await ApiResponseHandler.handleResponseWithResult(response, "Failed to delete custom template");
        } catch (error) {
            console.error("Failed to delete custom template", error);
            throw error;
        }
    }

    static async cloneCustomTemplate(payload: CloneTemplatePayload) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/template/clone`), {
                method: "POST",
                headers: getHeader(),
                body: JSON.stringify(payload),
            });
            return await ApiResponseHandler.handleResponse(response, "Failed to clone template");
        } catch (error) {
            console.error("Failed to clone template", error);
            throw error;
        }
    }

    static async cloneTemplateLayout(payload: CloneLayoutPayload) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/template/slide-layout/clone`), {
                method: "POST",
                headers: getHeader(),
                body: JSON.stringify(payload),
            });
            return await ApiResponseHandler.handleResponse(response, "Failed to clone layout");
        } catch (error) {
            console.error("Failed to clone layout", error);
            throw error;
        }
    }

    static async getTemplatePromptProfile(slug: string) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/templates/${encodeURIComponent(slug)}/prompt-profile`), {
                credentials: "include",
            });
            return await ApiResponseHandler.handleResponse(response, "Failed to get template prompt profile");
        } catch (error) {
            console.error("Failed to get template prompt profile", error);
            throw error;
        }
    }

    static async updateTemplatePromptProfile(slug: string, payload: TemplatePromptProfilePayload) {
        try {
            const response = await fetch(getApiUrl(`/api/v1/ppt/templates/${encodeURIComponent(slug)}/prompt-profile`), {
                method: "PATCH",
                headers: getHeader(),
                body: JSON.stringify(payload),
                credentials: "include",
            });
            return await handlePromptProfileResponse(response, "Failed to update template prompt profile");
        } catch (error) {
            console.error("Failed to update template prompt profile", error);
            throw error;
        }
    }

    static async getTemplatePromptProfileHistory(slug: string, limit = 20, offset = 0): Promise<PromptProfileHistoryPage> {
        const response = await fetch(
            getApiUrl(`/api/v1/ppt/templates/${encodeURIComponent(slug)}/prompt-profile/history?limit=${limit}&offset=${offset}`),
            { credentials: "include" }
        );
        return ApiResponseHandler.handleResponse(response, "Failed to get prompt profile history");
    }

    static async getTemplatePromptProfileHistoryRevision(slug: string, revisionId: string): Promise<PromptProfileHistoryDetail> {
        const response = await fetch(
            getApiUrl(`/api/v1/ppt/templates/${encodeURIComponent(slug)}/prompt-profile/history/${encodeURIComponent(revisionId)}`),
            { credentials: "include" }
        );
        return ApiResponseHandler.handleResponse(response, "Failed to get prompt profile revision");
    }

    static async restoreTemplatePromptProfileRevision(
        slug: string,
        revisionId: string,
        expectedCurrentFingerprint: string
    ) {
        const response = await fetch(
            getApiUrl(`/api/v1/ppt/templates/${encodeURIComponent(slug)}/prompt-profile/history/${encodeURIComponent(revisionId)}/restore`),
            {
                method: "POST",
                headers: getHeader(),
                credentials: "include",
                body: JSON.stringify({ expected_current_fingerprint: expectedCurrentFingerprint }),
            }
        );
        return handlePromptProfileResponse(response, "Failed to restore prompt profile revision");
    }
}

export default TemplateService;
