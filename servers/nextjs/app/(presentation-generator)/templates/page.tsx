"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { getHeader } from "../services/api/header";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Template {
    id: string;
    name: string;
    slug: string;
    description: string;
    is_system: boolean;
    is_default: boolean;
    item_count?: number; // Optional, if backend returns layout count
    created_at: string;
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchTemplates = async () => {
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const res = await fetch("/api/v1/ppt/templates", {
                headers: {
                    ...getHeader(),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error("Failed to fetch templates");
            const data = await res.json();
            setTemplates(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

        try {
            const token = localStorage.getItem("auth_token");
            const res = await fetch(`/api/v1/ppt/templates/${id}`, {
                method: "DELETE",
                headers: {
                    ...getHeader(),
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to delete");
            }

            toast.success("Template deleted");
            fetchTemplates(); // Refresh list
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your presentation templates and layouts.
                    </p>
                </div>
                <Link href="/templates/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <Card key={template.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">
                                        {template.description || "No description provided"}
                                    </CardDescription>
                                </div>
                                {template.is_system ? (
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                        System
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-foreground text-foreground">
                                        Custom
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="text-sm text-muted-foreground">
                                <span className="font-mono text-xs bg-muted p-1 rounded">
                                    {template.slug}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-4 border-t">
                            {template.is_system ? (
                                <Button variant="ghost" size="sm" disabled>
                                    Read-only
                                </Button>
                            ) : (
                                <>
                                    <Link href={`/templates/${template.slug}`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </Button>
                                    </Link>

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(template.id, template.name)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No templates found. Create your first custom template!
                    </div>
                )}
            </div>
        </div>
    );
}
