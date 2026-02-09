"use client";

import React, { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Copy, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiKeyService, ApiKey } from "../../services/api/apiKeys";

export default function ApiKeyManagement() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const keys = await apiKeyService.getAll();
            setApiKeys(keys);
        } catch (error) {
            toast.error("Failed to load API keys");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;

        try {
            setIsCreating(true);
            const response = await apiKeyService.create(newKeyName);
            setCreatedKey(response.api_key);
            await fetchKeys();
            toast.success("API Key created successfully");
        } catch (error) {
            toast.error("Failed to create API key");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
            return;
        }

        try {
            await apiKeyService.revoke(id);
            await fetchKeys();
            toast.success("API Key revoked successfully");
        } catch (error) {
            toast.error("Failed to revoke API key");
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success("Copied to clipboard");
        } catch (error) {
            toast.error("Failed to copy");
        }
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setCreatedKey(null);
        setNewKeyName("");
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    const formatDateTime = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">API Keys</h3>
                    <p className="text-sm text-gray-500">
                        Manage API keys for external access to the Presentation API.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                Enter a name for your new API key.
                            </DialogDescription>
                        </DialogHeader>

                        {!createdKey ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium">
                                        Key Name
                                    </label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Development Key"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                                        {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Create Key
                                    </Button>
                                </DialogFooter>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-800 font-medium mb-2">
                                        API Key Created Successfully!
                                    </p>
                                    <p className="text-xs text-green-700 mb-4">
                                        Please copy this key now. You won't be able to see it again.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-2 bg-white border border-green-200 rounded text-sm font-mono break-all">
                                            {createdKey}
                                        </code>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => copyToClipboard(createdKey)}
                                            className="shrink-0"
                                        >
                                            {isCopied ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={closeDialog}>Done</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : apiKeys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                    No API keys found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            apiKeys.map((key) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.name || "Untitled"}</TableCell>
                                    <TableCell>
                                        {key.is_active ? (
                                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Inactive</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {formatDate(key.created_at)}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {key.last_used_at
                                            ? formatDateTime(key.last_used_at)
                                            : "Never"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRevokeKey(key.id)}
                                            disabled={!key.is_active}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
