"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    buildPromptBlockId,
    parsePromptBlockId,
    PromptBlockIdentity,
    PromptBlockType,
    promptTargetMatchesBlock,
} from "../utils/promptBlockIds";

interface PromptTargetBox extends PromptBlockIdentity {
    id: string;
    rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
}

interface PromptInspectableSlideFrameProps {
    layoutId: string;
    inspectorEnabled: boolean;
    activeBlockId?: string | null;
    selectedBlockId?: string | null;
    flashBlockId?: string | null;
    children: React.ReactNode;
    onTargetHover?: (block: PromptBlockIdentity | null) => void;
    onTargetClick?: (block: PromptBlockIdentity) => void;
    onTargetsChange?: (layoutId: string, targetIds: string[]) => void;
}

function isInspectableType(value: string | null): value is Exclude<PromptBlockType, "layout"> {
    return value === "field" || value === "image";
}

export default function PromptInspectableSlideFrame({
    layoutId,
    inspectorEnabled,
    activeBlockId,
    selectedBlockId,
    flashBlockId,
    children,
    onTargetHover,
    onTargetClick,
    onTargetsChange,
}: PromptInspectableSlideFrameProps) {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const [targets, setTargets] = useState<PromptTargetBox[]>([]);

    const activeBlock = useMemo(() => parsePromptBlockId(activeBlockId), [activeBlockId]);
    const selectedBlock = useMemo(() => parsePromptBlockId(selectedBlockId), [selectedBlockId]);
    const flashBlock = useMemo(() => parsePromptBlockId(flashBlockId), [flashBlockId]);

    const measureTargets = useCallback(() => {
        const frame = frameRef.current;
        if (!frame) return;

        const frameRect = frame.getBoundingClientRect();
        const elements = Array.from(frame.querySelectorAll<HTMLElement>("[data-prompt-path][data-prompt-type]"));
        const measured = elements.flatMap((element): PromptTargetBox[] => {
            const path = element.dataset.promptPath;
            const type = element.dataset.promptType;
            if (!path || !isInspectableType(type)) return [];

            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return [];

            return [{
                id: buildPromptBlockId(layoutId, type, path),
                layoutId,
                type,
                path,
                rect: {
                    left: rect.left - frameRect.left,
                    top: rect.top - frameRect.top,
                    width: rect.width,
                    height: rect.height,
                },
            }];
        });

        setTargets(measured);
        onTargetsChange?.(layoutId, [
            buildPromptBlockId(layoutId, "layout"),
            ...Array.from(new Set(measured.map((target) => target.id))),
        ]);
    }, [layoutId, onTargetsChange]);

    useEffect(() => {
        measureTargets();
        const frame = frameRef.current;
        if (!frame) return undefined;

        const resizeObserver = new ResizeObserver(measureTargets);
        resizeObserver.observe(frame);
        const mutationObserver = new MutationObserver(measureTargets);
        mutationObserver.observe(frame, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
        });
        window.addEventListener("resize", measureTargets);

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("resize", measureTargets);
        };
    }, [measureTargets, children]);

    const shouldShowLayoutHighlight = [activeBlock, selectedBlock, flashBlock].some((block) => (
        block?.layoutId === layoutId && block.type === "layout"
    ));
    const showOverlay = inspectorEnabled || !!activeBlockId || !!selectedBlockId || !!flashBlockId;

    return (
        <div
            ref={frameRef}
            data-prompt-slide-frame={layoutId}
            className="relative h-full w-full"
            onMouseLeave={() => onTargetHover?.(null)}
        >
            {children}

            {showOverlay && (
                <div className="pointer-events-none absolute inset-0 z-[60]">
                    {(inspectorEnabled || shouldShowLayoutHighlight) && (
                        <button
                            type="button"
                            aria-label="Inspect layout prompt"
                            className={`absolute inset-0 rounded-sm border-2 transition ${
                                shouldShowLayoutHighlight
                                    ? "border-purple-500 bg-purple-500/10 shadow-[0_0_0_4px_rgba(122,90,248,0.18)]"
                                    : "border-purple-300/40 bg-transparent"
                            } ${inspectorEnabled ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                            onMouseEnter={() => onTargetHover?.({ layoutId, type: "layout" })}
                            onFocus={() => onTargetHover?.({ layoutId, type: "layout" })}
                            onClick={() => onTargetClick?.({ layoutId, type: "layout" })}
                        />
                    )}

                    {targets.map((target, index) => {
                        const isActive = !!activeBlock && promptTargetMatchesBlock(target, activeBlock);
                        const isSelected = !!selectedBlock && promptTargetMatchesBlock(target, selectedBlock);
                        const isFlash = !!flashBlock && promptTargetMatchesBlock(target, flashBlock);
                        const emphasized = isActive || isSelected || isFlash;

                        if (!inspectorEnabled && !emphasized) return null;

                        return (
                            <button
                                key={`${target.id}-${index}`}
                                type="button"
                                aria-label={`Inspect ${target.path || target.type} prompt target`}
                                className={`absolute rounded-md border-2 transition ${
                                    emphasized
                                        ? "border-purple-500 bg-purple-500/15 shadow-[0_0_0_3px_rgba(122,90,248,0.22)]"
                                        : "border-cyan-400/70 bg-cyan-300/10 hover:border-purple-500 hover:bg-purple-500/10"
                                } ${inspectorEnabled ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                                style={{
                                    left: `${target.rect.left}px`,
                                    top: `${target.rect.top}px`,
                                    width: `${target.rect.width}px`,
                                    height: `${target.rect.height}px`,
                                }}
                                onMouseEnter={() => onTargetHover?.(target)}
                                onFocus={() => onTargetHover?.(target)}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onTargetClick?.(target);
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
