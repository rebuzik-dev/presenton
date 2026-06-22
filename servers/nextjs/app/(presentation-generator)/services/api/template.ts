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
    layout_prompts: Record<string, {
        layout_prompt?: string;
        field_prompts?: Record<string, string>;
        image_prompt_overrides?: Record<string, string>;
    }>;
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
            return await ApiResponseHandler.handleResponse(response, "Failed to update template prompt profile");
        } catch (error) {
            console.error("Failed to update template prompt profile", error);
            throw error;
        }
    }
}

export default TemplateService;
