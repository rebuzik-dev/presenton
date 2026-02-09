import { getHeader } from "./header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiKey {
    id: string;
    name: string;
    created_at: string;
    last_used_at: string | null;
    is_active: boolean;
}

export interface CreateApiKeyResponse {
    id: string;
    name: string;
    api_key: string; // The full key, returned only once
    created_at: string;
}

export const apiKeyService = {
    // List all API keys
    getAll: async (): Promise<ApiKey[]> => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/api-keys`, {
                method: "GET",
                headers: getHeader(),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch API keys");
            }

            return await response.json();
        } catch (error) {
            console.error("Error fetching API keys:", error);
            throw error;
        }
    },

    // Create a new API key
    create: async (name: string): Promise<CreateApiKeyResponse> => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/api-keys`, {
                method: "POST",
                headers: getHeader(),
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to create API key");
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating API key:", error);
            throw error;
        }
    },

    // Revoke an API key
    revoke: async (id: string): Promise<void> => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/api-keys/${id}`, {
                method: "DELETE",
                headers: getHeader(),
            });

            if (!response.ok) {
                throw new Error("Failed to revoke API key");
            }
        } catch (error) {
            console.error("Error revoking API key:", error);
            throw error;
        }
    },
};
