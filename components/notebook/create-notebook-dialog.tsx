
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWorkspaces } from "@/hooks/useWorkspace";
import { ApiClientError } from "@/lib/api-client";

export function CreateNotebookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
const {
  workspaces,
  isLoading,
  createWorkspace,
} = useWorkspaces();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
     const newWorkspace= await createWorkspace.mutateAsync({
title: title.trim(),
        description: description.trim() || undefined,
});
    
      toast.success("Notebook created");
      onOpenChange(false);
      reset();
      router.push(`/notebooks/${newWorkspace.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to create notebook");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create notebook</DialogTitle>
            <DialogDescription>
              Give your research workspace a name. You can add sources once it's created.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="notebook-title">Name</FieldLabel>
              <Input
                id="notebook-title"
                autoFocus
                placeholder="AI Research"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notebook-description">Description</FieldLabel>
              <Textarea
                id="notebook-description"
                placeholder="Papers and notes on retrieval-augmented generation"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 size-3.5" />}
              {isSubmitting ? "Creating..." : "Create notebook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
