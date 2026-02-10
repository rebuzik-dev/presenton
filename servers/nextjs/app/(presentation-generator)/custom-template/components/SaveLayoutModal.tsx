import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";

interface SaveLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    layoutName: string,
    description: string,
    slug: string
  ) => Promise<string | null>;
  isSaving: boolean;
}

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const SaveLayoutModal: React.FC<SaveLayoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [layoutName, setLayoutName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const isSlugValid =
    slug.length > 0 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug);

  const handleSave = async () => {
    if (!layoutName.trim() || !isSlugValid) {
      return; // Don't save if name is empty
    }
    await onSave(layoutName.trim(), description.trim(), slug.trim());
    // Reset form after navigation decision
    setLayoutName("");
    setDescription("");
    setSlug("");
    setIsSlugManuallyEdited(false);
  };

  const handleClose = () => {
    if (!isSaving) {
      setLayoutName("");
      setDescription("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-green-600" />
            Save Template
          </DialogTitle>
          <DialogDescription>
            Enter a name and description for your template. This will help you identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="layout-name" className="text-sm font-medium">
              Template Name *
            </Label>
            <Input
              id="layout-name"
              value={layoutName}
              onChange={(e) => {
                const nextName = e.target.value;
                setLayoutName(nextName);
                if (!isSlugManuallyEdited) {
                  setSlug(slugify(nextName));
                }
              }}
              placeholder="Enter template name..."
              disabled={isSaving}
              className="w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-slug" className="text-sm font-medium">
              Slug *
            </Label>
            <Input
              id="template-slug"
              value={slug}
              onChange={(e) => {
                setIsSlugManuallyEdited(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. sales-q3-deck"
              disabled={isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Use lowercase letters, numbers, and `-`. This is the value for API
              calls in `template`.
            </p>
            {!isSlugValid && slug.length > 0 && (
              <p className="text-xs text-red-600">
                Invalid slug format.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your template..."
              disabled={isSaving}
              className="w-full resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !layoutName.trim() || !isSlugValid}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
