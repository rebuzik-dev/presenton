"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, History, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import TemplateService, {
    PromptProfileChange,
    PromptProfileHistoryDetail,
    PromptProfileHistoryItem,
    TemplatePromptConflictError,
} from "../services/api/template";

interface TemplatePromptHistorySheetProps {
    slug: string;
    open: boolean;
    currentFingerprint: string;
    onOpenChange: (open: boolean) => void;
    onProfileChanged: () => Promise<void> | void;
}

const PAGE_SIZE = 20;

const scopeLabels: Record<PromptProfileChange["scope"], string> = {
    template: "Template",
    layout: "Layout",
    field: "Field",
    image: "Image",
};

function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "Not set";
    if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
}

function HistorySkeleton() {
    return (
        <div className="space-y-3 p-5" aria-label="Loading prompt history">
            {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-36" />
                </div>
            ))}
        </div>
    );
}

export default function TemplatePromptHistorySheet({
    slug,
    open,
    currentFingerprint,
    onOpenChange,
    onProfileChanged,
}: TemplatePromptHistorySheetProps) {
    const [items, setItems] = useState<PromptProfileHistoryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRevision, setExpandedRevision] = useState("");
    const [details, setDetails] = useState<Record<string, PromptProfileHistoryDetail>>({});
    const [detailLoading, setDetailLoading] = useState<string | null>(null);
    const [restoreCandidate, setRestoreCandidate] = useState<PromptProfileHistoryItem | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [canRestore, setCanRestore] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem("auth_role");
        setCanRestore(role !== "viewer");
    }, []);

    const loadPage = useCallback(async (offset: number, reset: boolean) => {
        if (!slug) return;
        reset ? setLoading(true) : setLoadingMore(true);
        try {
            const page = await TemplateService.getTemplatePromptProfileHistory(slug, PAGE_SIZE, offset);
            setItems((current) => reset ? page.items : [...current, ...page.items]);
            setTotal(page.total);
            setError(null);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to load prompt history");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [slug]);

    useEffect(() => {
        if (!open) return;
        setExpandedRevision("");
        setDetails({});
        void loadPage(0, true);
    }, [open, loadPage]);

    const loadDetail = useCallback(async (revisionId: string) => {
        if (!revisionId || details[revisionId]) return;
        setDetailLoading(revisionId);
        try {
            const detail = await TemplateService.getTemplatePromptProfileHistoryRevision(slug, revisionId);
            setDetails((current) => ({ ...current, [revisionId]: detail }));
        } catch (detailError) {
            toast.error(detailError instanceof Error ? detailError.message : "Failed to load revision details");
        } finally {
            setDetailLoading(null);
        }
    }, [details, slug]);

    const handleExpandedChange = (revisionId: string) => {
        setExpandedRevision(revisionId);
        if (revisionId) void loadDetail(revisionId);
    };

    const handleRestore = async () => {
        if (!restoreCandidate) return;
        setRestoring(true);
        try {
            await TemplateService.restoreTemplatePromptProfileRevision(
                slug,
                restoreCandidate.revision_id,
                currentFingerprint,
            );
            await onProfileChanged();
            await loadPage(0, true);
            setDetails({});
            setExpandedRevision("");
            setRestoreCandidate(null);
            toast.success(`Version ${restoreCandidate.version} restored`);
        } catch (restoreError) {
            if (restoreError instanceof TemplatePromptConflictError) {
                await onProfileChanged();
                await loadPage(0, true);
            }
            toast.error(restoreError instanceof Error ? restoreError.message : "Failed to restore prompt profile");
        } finally {
            setRestoring(false);
        }
    };

    const hasMore = items.length < total;
    const historySummary = useMemo(() => {
        if (loading) return "Loading revisions";
        if (total === 0) return "No saved revisions";
        return `${total} saved revision${total === 1 ? "" : "s"}`;
    }, [loading, total]);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="z-[120] w-full p-0 sm:max-w-[560px]"
                    overlayClassName="z-[110] bg-black/20 backdrop-blur-[2px]"
                >
                    <SheetHeader className="border-b px-5 py-4 text-left">
                        <SheetTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" aria-hidden="true" />
                            Prompt override history
                        </SheetTitle>
                        <SheetDescription>
                            {historySummary}. Review changes or restore the complete override profile.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="h-[calc(100vh-105px)]">
                        {loading ? (
                            <HistorySkeleton />
                        ) : error ? (
                            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">History could not be loaded</p>
                                        <p className="mt-1 text-sm text-muted-foreground break-words">{error}</p>
                                        <Button className="mt-3" size="sm" variant="outline" onClick={() => void loadPage(0, true)}>
                                            Try again
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex min-h-64 flex-col items-center justify-center px-8 text-center">
                                <Clock3 className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
                                <p className="mt-3 font-medium">No override history yet</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    The first saved prompt profile will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4">
                                <Accordion type="single" collapsible value={expandedRevision} onValueChange={handleExpandedChange}>
                                    {items.map((item) => {
                                        const detail = details[item.revision_id];
                                        return (
                                            <AccordionItem
                                                key={item.revision_id}
                                                value={item.revision_id}
                                                className="mb-3 rounded-lg border px-4 last:mb-0"
                                            >
                                                <AccordionTrigger className="min-h-16 py-3 hover:no-underline">
                                                    <div className="min-w-0 flex-1 pr-3 text-left">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold">Version {item.version}</span>
                                                            {item.is_current && <Badge>Current</Badge>}
                                                            {item.action === "restore" && <Badge variant="outline">Restore</Badge>}
                                                        </div>
                                                        <p className="mt-1 text-xs font-normal text-muted-foreground">
                                                            {formatTimestamp(item.created_at)} · {item.author || "System"}
                                                        </p>
                                                        <p className="mt-1 truncate text-sm font-normal text-muted-foreground">
                                                            {item.change_count} change{item.change_count === 1 ? "" : "s"}
                                                            {item.changed_layout_ids.length > 0
                                                                ? ` · ${item.changed_layout_ids.length} layout${item.changed_layout_ids.length === 1 ? "" : "s"}`
                                                                : ""}
                                                        </p>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pb-4">
                                                    {detailLoading === item.revision_id ? (
                                                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" aria-live="polite">
                                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                            Loading diff…
                                                        </div>
                                                    ) : detail ? (
                                                        <div className="space-y-3">
                                                            {detail.changes.length === 0 ? (
                                                                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                                                                    Baseline snapshot with no recorded diff.
                                                                </p>
                                                            ) : detail.changes.map((change, index) => (
                                                                <div key={`${change.scope}-${change.layout_id}-${change.path}-${index}`} className="rounded-md border bg-muted/20 p-3">
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                        <Badge variant="outline">{scopeLabels[change.scope]}</Badge>
                                                                        <Badge variant="secondary">{change.action}</Badge>
                                                                        <span className="break-all font-mono text-muted-foreground">
                                                                            {change.layout_id ? `${change.layout_id} · ` : ""}{change.path}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                        <div className="min-w-0 rounded border bg-background p-2">
                                                                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Before</p>
                                                                            <pre className="whitespace-pre-wrap break-words font-sans text-xs">{formatValue(change.before)}</pre>
                                                                        </div>
                                                                        <div className="min-w-0 rounded border bg-background p-2">
                                                                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">After</p>
                                                                            <pre className="whitespace-pre-wrap break-words font-sans text-xs">{formatValue(change.after)}</pre>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {canRestore && !item.is_current && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="w-full sm:w-auto"
                                                                    onClick={() => setRestoreCandidate(item)}
                                                                >
                                                                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                                                                    Restore this version
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>

                                {hasMore && (
                                    <Button
                                        className="mt-4 w-full"
                                        variant="outline"
                                        disabled={loadingMore}
                                        onClick={() => void loadPage(items.length, false)}
                                    >
                                        {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                                        Load more
                                    </Button>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <Dialog open={Boolean(restoreCandidate)} onOpenChange={(nextOpen) => !nextOpen && !restoring && setRestoreCandidate(null)}>
                <DialogContent
                    className="z-[140] sm:max-w-[480px]"
                    overlayClassName="z-[130]"
                >
                    <DialogHeader>
                        <DialogTitle>Restore version {restoreCandidate?.version}?</DialogTitle>
                        <DialogDescription>
                            This replaces the complete current template, layout, field, and image override profile. A new audit revision will be saved.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreCandidate(null)} disabled={restoring}>
                            Cancel
                        </Button>
                        <Button onClick={() => void handleRestore()} disabled={restoring}>
                            {restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                            Restore profile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
