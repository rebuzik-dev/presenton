"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, RotateCcw, Loader2, HelpCircle } from "lucide-react";

interface InlinePromptBlockEditorProps {
    label: string;
    sourcePrompt?: string | null;
    savedOverride?: string | null;
    onSave: (value: string) => Promise<unknown>;
    onReset: () => Promise<unknown>;
    onCancel: () => void;
    isDisabled?: boolean;
}

export default function InlinePromptBlockEditor({
    label,
    sourcePrompt,
    savedOverride,
    onSave,
    onReset,
    onCancel,
    isDisabled = false,
}: InlinePromptBlockEditorProps) {
    const [draft, setDraft] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize/sync draft with saved override
    useEffect(() => {
        setDraft(savedOverride || "");
    }, [savedOverride]);

    const isUnsaved = draft.trim() !== (savedOverride || "").trim();
    const hasOverride = !!savedOverride && savedOverride.trim() !== "";

    const handleSaveClick = async () => {
        if (!isUnsaved || isDisabled || isSubmitting) return;
        try {
            setIsSubmitting(true);
            await onSave(draft);
        } catch (error) {
            console.error("Failed to save prompt block:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetClick = async () => {
        if (isDisabled || isSubmitting) return;
        const confirmed = window.confirm(`Are you sure you want to reset the override for "${label}"?`);
        if (!confirmed) return;
        try {
            setIsSubmitting(true);
            await onReset();
            setDraft("");
        } catch (error) {
            console.error("Failed to reset prompt block:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2 space-y-4 shadow-inner transition-all">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Editing Block
                    </span>
                    <span className="text-sm font-semibold text-gray-800 font-mono">
                        {label}
                    </span>
                </div>
                {isUnsaved && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-medium animate-pulse">
                        Unsaved Changes
                    </span>
                )}
            </div>

            {/* Source prompt (read-only) */}
            {sourcePrompt !== undefined && (
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Source Prompt / Base Description
                    </label>
                    <div className="bg-white border border-gray-150 rounded-lg p-2.5 text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                        {sourcePrompt || <span className="italic text-gray-400">None specified</span>}
                    </div>
                </div>
            )}

            {/* Saved override (read-only, only if exists) */}
            {hasOverride && (
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Saved Override
                    </label>
                    <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-2.5 text-xs text-purple-900 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                        {savedOverride}
                    </div>
                </div>
            )}

            {/* Draft input */}
            <div className="space-y-1.5">
                <label htmlFor={`draft-${label}`} className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                    Draft Override Prompt
                </label>
                <Textarea
                    id={`draft-${label}`}
                    placeholder={
                        isDisabled
                            ? "This slot has no editable path mapped in fields_summary."
                            : "Enter your custom instructions or prompt details..."
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={isDisabled || isSubmitting}
                    rows={3}
                    className="rounded-lg border-gray-300 font-sans text-xs leading-relaxed bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
                <div>
                    {hasOverride && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetClick}
                            disabled={isDisabled || isSubmitting}
                            className="h-8 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset Override
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="h-8 px-3 text-xs text-gray-500 hover:bg-gray-150"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveClick}
                        disabled={!isUnsaved || isDisabled || isSubmitting}
                        size="sm"
                        className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                            <Save className="w-3 h-3 mr-1" />
                        )}
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
