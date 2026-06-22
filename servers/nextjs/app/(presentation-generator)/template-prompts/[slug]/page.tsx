"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import TemplatePromptEditorPanel from "../../components/TemplatePromptEditorPanel";

export default function TemplatePromptEditorPage() {
    const params = useParams();

    const slug = useMemo((): string => {
        const value = params?.slug;
        if (typeof value === "string") return value;
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return value[0];
        return "";
    }, [params]);

    return <TemplatePromptEditorPanel slug={slug} compact={false} />;
}
