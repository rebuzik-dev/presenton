import React from "react";

import { PromptBlockType } from "../utils/promptBlockIds";

interface PromptTargetOptions {
    path: string;
    type: Exclude<PromptBlockType, "layout">;
    id?: string;
    name?: string;
    description?: string;
    role?: string;
}

export function promptTargetAttrs({ path, type, id, name, description, role }: PromptTargetOptions) {
    return {
        "data-prompt-path": path,
        "data-prompt-type": type,
        ...(id ? { "data-prompt-id": id } : {}),
        ...(name ? { "data-prompt-name": name } : {}),
        ...(description ? { "data-prompt-description": description } : {}),
        ...(role ? { "data-prompt-role": role } : {}),
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
