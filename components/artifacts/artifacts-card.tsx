
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pin, PinOff, Trash2, Loader2, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArtifactTypeIcon, ARTIFACT_TYPE_LABELS } from "@/components/artifacts/artifact-type-icons";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiClientError } from "@/lib/api-client";
import type { Artifact } from "@/types";
import { cn } from "@/lib/utils";

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

export function ArtifactCard({
  workspaceId,
  artifact,
  onDelete,
  onTogglePin,
}: {
  workspaceId: string;
  artifact: Artifact;
  onDelete: (id: string) => Promise<void>;
  onTogglePin: (id: string, isPinned: boolean) => Promise<Artifact>;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isGenerating = artifact.status === "GENERATING";
  const isFailed = artifact.status === "FAILED";

  const preview = artifact.description ?? artifact.content?.slice(0, 140) ?? null;
  const artifactHref = `/notebooks/${workspaceId}/artifacts/${artifact.id}`;

  const openArtifact = () => {
    if (!isGenerating && !isFailed) {
      router.push(artifactHref);
    }
  };

  const cardContent = (
    <Card
      onClick={openArtifact}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openArtifact();
        }
      }}
      role={!isGenerating && !isFailed ? "link" : undefined}
      tabIndex={!isGenerating && !isFailed ? 0 : undefined}
      className={cn(
        "group relative flex h-full flex-col p-5 transition-all duration-200",
        !isGenerating && !isFailed && "hover:-translate-y-0.5 hover:shadow-md",
        isFailed && "border-destructive/30",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <ArtifactTypeIcon type={artifact.type} />
        </span>

        <div className="flex items-center gap-1">
          {artifact.isPinned && <Pin className="size-3.5 fill-current text-primary" />}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              }
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Artifact actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async (event) => {
                  event.stopPropagation();
                  try {
                    await onTogglePin(artifact.id, !artifact.isPinned);
                  } catch (error) {
                    toast.error(error instanceof ApiClientError ? error.message : "Failed to update");
                  }
                }}
              >
                {artifact.isPinned ? (
                  <>
                    <PinOff className="mr-2 size-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 size-4" />
                    Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{ARTIFACT_TYPE_LABELS[artifact.type]}</p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold tracking-tight">{artifact.title}</h3>
        {preview && !isGenerating && !isFailed && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{preview}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Generating...
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <XCircle className="size-3.5" />
            Failed
          </span>
        )}
        {!isGenerating && !isFailed && (
          <span className="text-muted-foreground">Generated {formatRelativeTime(artifact.createdAt)}</span>
        )}
        {!isGenerating && !isFailed && (
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Open
            <ArrowRight className="size-3" />
          </span>
        )}
      </div>
    </Card>
  );

  return (
    <>
      {isGenerating || isFailed ? (
        cardContent
      ) : (
        cardContent
      )}

      <ConfirmDialog
        open={confirmOpen}
        
        onOpenChange={setConfirmOpen}
        title={`Delete "${artifact.title}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await onDelete(artifact.id);
            toast.success("Artifact deleted");
          } catch {
            toast.error("Failed to delete artifact");
          }
        }}
      />
    </>
  );
}