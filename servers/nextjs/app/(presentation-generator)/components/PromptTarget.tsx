import React from "react";

import { PromptBlockType } from "../utils/promptBlockIds";

interface PromptTargetOptions {
    path: string;
    type: Exclude<PromptBlockType, "layout">;
    id?: string;
}

export function promptTargetAttrs({ path, type, id }: PromptTargetOptions) {
    return {
        "data-prompt-path": path,
        "data-prompt-type": type,
        ...(id ? { "data-prompt-id": id } : {}),
    };
}

interface PromptTargetProps extends PromptTargetOptions {
    children: React.ReactNode;
    className?: string;
}

export function PromptTarget({ children, className, ...options }: PromptTargetProps) {
    return (
        <span className={className} {...promptTargetAttrs(options)}>
            {children}
        </span>
    );
}
