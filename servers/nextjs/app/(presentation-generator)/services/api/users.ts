import { getHeader } from "./header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserRole = "superadmin" | "admin" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export const usersService = {
  getMe: async (): Promise<AuthUser> => {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: "GET",
      headers: getHeader(),
    });

    if (!response.ok) {
      throw new Error("Failed to load current user");
    }

    return await response.json();
  },

  getAll: async (): Promise<AuthUser[]> => {
    const response = await fetch(`${API_URL}/api/v1/auth/users`, {
      method: "GET",
      headers: getHeader(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to load users");
    }

    return await response.json();
  },

  updateRole: async (userId: string, role: UserRole): Promise<AuthUser> => {
    const response = await fetch(`${API_URL}/api/v1/auth/users/${userId}/role`, {
      method: "PATCH",
      headers: getHeader(),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to update role");
    }

    return await response.json();
  },
};
