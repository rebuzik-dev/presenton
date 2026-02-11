"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getHeader } from "../services/api/header";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const tokenFromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("token")
        : null;
    const apiKeyFromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("api_key")
        : null;
    const tokenFromStorage =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const token = tokenFromQuery || tokenFromStorage;

    // Allow headless/internal flows to bootstrap auth via URL token.
    if (tokenFromQuery) {
      localStorage.setItem("auth_token", tokenFromQuery);
    }

    // For API-key-only flows (headless export), skip JWT /me check.
    if (!token && apiKeyFromQuery) {
      setChecking(false);
      return;
    }

    if (!token && !apiKeyFromQuery) {
      router.replace("/login");
      return;
    }
    document.cookie = `auth_token=${token}; path=/; SameSite=Lax`;

    fetch("/api/v1/auth/me", {
      headers: {
        ...getHeader(),
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("auth_token");
          router.replace("/login");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        router.replace("/login");
      });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F3F5F7] via-[#EEF2F3] to-[#E6ECEF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/80 backdrop-blur px-6 py-8 shadow-xl">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Checking
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-800">
            Verifying session
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse bg-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
