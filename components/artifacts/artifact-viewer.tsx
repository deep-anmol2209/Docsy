"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Loader2,
  XCircle,
  FileStack,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ArtifactTypeIcon,
  ARTIFACT_TYPE_LABELS,
} from "@/components/artifacts/artifact-type-icons";

import { ArtifactRenderer } from "@/components/artifacts/artifact-renderer";

import { useArtifact } from "@/hooks/useArtifact";
import { useArtifacts } from "@/hooks/useArtifact";
import { ApiClientError } from "@/lib/api-client";

function sanitizeFileName(title: string): string {
  return (
    title
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 80) || "artifact"
  );
}

export function ArtifactViewer({
  workspaceId,
  artifactId,
}: {
  workspaceId: string;
  artifactId: string;
}) {
  const router = useRouter();

  const { artifact, isLoading, error } = useArtifact(
    workspaceId,
    artifactId,
  );

  const { deleteArtifact, togglePin } = useArtifacts(workspaceId);

  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCopy = async () => {
    if (!artifact?.content) return;

    try {
      await navigator.clipboard.writeText(artifact.content);

      setCopied(true);
      toast.success("Copied to clipboard");

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    if (!artifact?.content) return;

    const blob = new Blob([artifact.content], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(artifact.title)}.md`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (isLoading && !artifact) {
    return (
      <div className=" px-6 py-8 space-y-4">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-8 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-40 rounded-md" />

        <div className="space-y-2 pt-6">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div className="px-6 py-8">
        <EmptyState
          icon={<FileStack />}
          title="Failed to load artifact"
          description={error ?? undefined}
        />
      </div>
    );
  }

  const isGenerating = artifact.status === "GENERATING";
  const isFailed = artifact.status === "FAILED";

  const failureReason =
    isFailed &&
    artifact.metadata &&
    typeof artifact.metadata === "object"
      ? (artifact.metadata as Record<string, unknown>).failureReason
      : undefined;

  return (
 <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Back */}
      <Link
        href={`/notebooks/${workspaceId}/artifacts`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Artifacts
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArtifactTypeIcon type={artifact.type} />
          </span>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {ARTIFACT_TYPE_LABELS[artifact.type]}
            </p>

            <h1 className="truncate text-xl font-semibold tracking-tight">
              {artifact.title}
            </h1>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Generated{" "}
              {new Date(artifact.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isGenerating && !isFailed && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopy}
              disabled={!artifact.content}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownload}
              disabled={!artifact.content}
            >
              <Download className="size-3.5" />
              Download
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More actions</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await togglePin(
                        artifact.id,
                        !artifact.isPinned,
                      );
                    } catch (err) {
                      toast.error(
                        err instanceof ApiClientError
                          ? err.message
                          : "Failed to update",
                      );
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
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-8">
        {/* Generating */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />

            <p className="text-sm text-muted-foreground">
              Generating your{" "}
              {ARTIFACT_TYPE_LABELS[
                artifact.type
              ].toLowerCase()}
              ...
            </p>
          </div>
        )}

        {/* Failed */}
        {isFailed && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-16 text-center">
            <XCircle className="size-6 text-destructive" />

            <p className="text-sm font-medium">
              Generation failed
            </p>

            {typeof failureReason === "string" && (
              <p className="max-w-md text-xs text-muted-foreground">
                {failureReason}
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              Delete
            </Button>
          </div>
        )}

        {/* Artifact renderer */}
        {!isGenerating && !isFailed && (
          <ArtifactRenderer artifact={artifact} />
        )}

        {/* Sources */}
        {artifact.sources && artifact.sources.length > 0 && (
          <div className="mt-10 border-t border-border/60 pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Generated from{" "}
              {artifact.sources.length} source
              {artifact.sources.length === 1 ? "" : "s"}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {artifact.sources.map((ref) => (
                <span
                  key={ref.sourceId}
                  className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {ref.source.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${artifact.title}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteArtifact(artifact.id);

            toast.success("Artifact deleted");

            router.push(
              `/notebooks/${workspaceId}/artifacts`,
            );
          } catch {
            toast.error("Failed to delete artifact");
          }
        }}
      />
    </div>
  );
}