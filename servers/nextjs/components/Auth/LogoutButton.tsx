"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { getApiUrl } from "@/utils/api";

type LogoutButtonProps = {
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

export default function LogoutButton({
  label = "Logout",
  className = "",
  iconOnly = false,
}: LogoutButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(getApiUrl("/api/v1/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Always route back to auth gate even if backend logout fails.
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_role");
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "presenton_session=; path=/; max-age=0; SameSite=Lax";
      window.location.replace("/");
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className={className}
      aria-label={label}
      title={label}
    >
      <LogOut className="h-4 w-4" />
      {!iconOnly ? <span>{isSubmitting ? "Signing out..." : label}</span> : null}
    </button>
  );
}
