export type PromptBlockType = "layout" | "field" | "image";

export interface PromptBlockIdentity {
    layoutId: string;
    type: PromptBlockType;
    path?: string | null;
}

const ARRAY_INDEX_PATTERN = /\[(\d+)\]/g;
const NUMERIC_SEGMENT_PATTERN = /^\d+$/;

export function normalizePromptPath(path?: string | null): string {
    if (!path) return "";
    return path
        .trim()
        .replace(ARRAY_INDEX_PATTERN, ".$1")
        .replace(/\[\]/g, ".[]")
        .split(".")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .join(".");
}

function tokenizePromptPath(path?: string | null): string[] {
    return normalizePromptPath(path).split(".").filter(Boolean);
}

export function promptPathsMatch(a?: string | null, b?: string | null): boolean {
    const aParts = tokenizePromptPath(a);
    const bParts = tokenizePromptPath(b);
    if (!aParts.length || !bParts.length || aParts.length !== bParts.length) {
        return false;
    }

    return aParts.every((part, index) => {
        const other = bParts[index];
        if (part === other) return true;
        if (part === "[]" && NUMERIC_SEGMENT_PATTERN.test(other)) return true;
        if (other === "[]" && NUMERIC_SEGMENT_PATTERN.test(part)) return true;
        return false;
    });
}

export function buildPromptBlockId(layoutId: string, type: PromptBlockType, path?: string | null): string {
    const normalizedLayoutId = layoutId || "unknown-layout";
    const encodedLayoutId = encodeURIComponent(normalizedLayoutId);
    if (type === "layout") return `${encodedLayoutId}:${type}`;
    return `${encodedLayoutId}:${type}:${encodeURIComponent(normalizePromptPath(path) || "unknown")}`;
}

export function promptTargetMatchesBlock(
    target: PromptBlockIdentity,
    block: PromptBlockIdentity
): boolean {
    if (target.layoutId !== block.layoutId || target.type !== block.type) {
        return false;
    }
    if (block.type === "layout") return true;
    return promptPathsMatch(target.path, block.path);
}

export function parsePromptBlockId(id?: string | null): PromptBlockIdentity | null {
    if (!id) return null;
    const [layoutId, type, ...pathParts] = id.split(":");
    if (!layoutId || (type !== "layout" && type !== "field" && type !== "image")) {
        return null;
    }
    return {
        layoutId: decodeURIComponent(layoutId),
        type,
        path: type === "layout" ? undefined : decodeURIComponent(pathParts.join(":")),
    };
}
