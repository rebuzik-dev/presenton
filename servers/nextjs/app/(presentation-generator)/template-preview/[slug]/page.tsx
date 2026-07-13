"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyTemplatePreviewRedirect() {
    const params = useParams<{ slug: string }>();
    const router = useRouter();

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
        query.set("slug", slug);
        if (query.get("panel") === "prompts") {
            query.set("inspector", "1");
        }
        query.delete("panel");
        router.replace(`/template-preview?${query.toString()}`, { scroll: false });
    }, [params.slug, router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="ml-3 text-sm text-muted-foreground">Opening template preview…</span>
        </main>
    );
}
