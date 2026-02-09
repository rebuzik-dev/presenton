"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("auth_token", data.access_token);
      if (data.user?.role) {
        localStorage.setItem("auth_role", data.user.role);
      }
      document.cookie = `auth_token=${data.access_token}; path=/; SameSite=Lax`;
      router.replace("/upload");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f6f7fb,_#eef1f4_40%,_#e7edf1)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-slate-200/80">
        <CardHeader className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Presenton
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-800">
            Welcome back
          </CardTitle>
          <CardDescription className="text-slate-500">
            Sign in to continue creating presentations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-slate-500">
            No account yet?{" "}
            <Link className="text-slate-700 underline hover:text-slate-900" href="/register">
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
