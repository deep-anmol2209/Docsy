"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, FileStack, Sparkles, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/shared/brand-mark";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RenameNotebookDialog } from "@/components/notebook/rename-dialog";
import type { Workspace } from "@/types";
import { useWorkspaces } from "@/hooks/useWorkspace";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotebookCard({ workspace }: { workspace: Workspace }) {
  const { deleteWorkspace } = useWorkspaces();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
console.log(workspace);

  return (
    <>
      <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <Link href={`/notebooks/${workspace.id}`} className="absolute inset-0 z-0" aria-label={`Open ${workspace.title}`} />

        <div className="relative z-10 flex items-start justify-between">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrandMark className="size-4" />
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                />
              }
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Notebook actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/notebooks/${workspace.id}`} />}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative z-10 mt-4">
          <h3 className="truncate text-base font-semibold tracking-tight">{workspace.title}</h3>
          {workspace.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{workspace.description}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground/60 italic">No description</p>
          )}
        </div>

        <div className="relative z-10 mt-5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileStack className="size-3.5" />
            {workspace._count?.sources ?? 0} source{workspace._count?.sources === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            {workspace._count?.artifacts ?? 0} artifact{workspace._count?.artifacts === 1 ? "" : "s"}
          </span>
        </div>

        <p className="relative z-10 mt-3 text-xs text-muted-foreground/70">
          Updated {formatRelativeTime(workspace.updatedAt)}
        </p>
      </Card>

      <RenameNotebookDialog workspace={workspace} open={renameOpen} onOpenChange={setRenameOpen} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${workspace.title}"?`}
        description="This permanently deletes the notebook, its sources, conversations, and artifacts. This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteWorkspace.mutateAsync(workspace.id);
            toast.success("Notebook deleted");
          } catch {
            toast.error("Failed to delete notebook");
          }
        }}
      />
    </>
  );
}