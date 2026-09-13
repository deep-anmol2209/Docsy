"use client";

import { useState } from "react";
import { MoreHorizontal, Check, AlertTriangle, ExternalLink, Info, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceTypeIcon } from "@/components/sources/source-type-icons";
import { SourceProgressBar } from "@/components/sources/source-progress";
import { SourceDetailsDialog } from "@/components/sources/source-detail-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiClientError } from "@/lib/api-client";
import type { Source } from "@/types";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function SourceCard({
  source,
  onDelete,
  onRetry,
    isDeleting,
isRetrying
}: {
  source: Source;
  onDelete: (sourceId: string) => Promise<void>;
  onRetry: (sourceId: string) => Promise<void>;
    isDeleting: boolean;
  isRetrying: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
 

  const isReady = source.ingestionStatus === "COMPLETED";
  const isFailed = source.ingestionStatus === "FAILED";
  const externalUrl = source.url ?? (source.type === "PDF" ? source.storageLocation : null);

  return (
    <>
      <Card
        className={cn(
          "group relative p-4 transition-colors",
          isFailed && "border-destructive/30",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
              isFailed ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
            )}
          >
            <SourceTypeIcon type={source.type} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-medium">{source.title}</h3>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Source actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {externalUrl && (
                    <DropdownMenuItem onClick={() => window.open(externalUrl, "_blank", "noopener,noreferrer")}>
                      <ExternalLink className="mr-2 size-4" />
                      Open
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
                    <Info className="mr-2 size-4" />
                    View details
                  </DropdownMenuItem>
                {isFailed && (
  <DropdownMenuItem
    disabled={isRetrying}
    onClick={async () => {
      try {
        await onRetry(source.id);
        toast.success("Retrying source");
      } catch (error) {
        toast.error(
          error instanceof ApiClientError
            ? error.message
            : "Retry failed",
        );
      }
    }}
  >
    <RotateCw
      className={cn(
        "mr-2 size-4",
        isRetrying && "animate-spin",
      )}
    />
    {isRetrying ? "Retrying..." : "Retry"}
  </DropdownMenuItem>
)}
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {(source.url || source.originalReference) && (
              <p className="truncate text-xs text-muted-foreground">
                {source.url ?? source.originalReference}
              </p>
            )}

            <div className="mt-3">
              {isReady && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  Ready
                </span>
              )}

              {isFailed && (
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    Processing failed
                  </span>
     <Button
  size="sm"
  variant="outline"
  className="h-7 text-xs"
  disabled={isRetrying}
  onClick={async () => {
    try {
      await onRetry(source.id);
      toast.success("Retrying source");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Retry failed",
      );
    }
  }}
>
  <RotateCw
    className={cn(
      "mr-1.5 size-3",
      isRetrying && "animate-spin",
    )}
  />
  {isRetrying ? "Retrying..." : "Retry"}
</Button>
                </div>
              )}

              {!isReady && !isFailed && <SourceProgressBar state={source.ingestionStatus} />}
            </div>

            {(isReady || isFailed) && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                Added {formatRelativeTime(source.createdAt)}
              </p>
            )}
          </div>
        </div>
      </Card>

      <SourceDetailsDialog source={source} open={detailsOpen} onOpenChange={setDetailsOpen} />
<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title={`Delete "${source.title}"?`}
  description="This removes the source and everything derived from it. This can't be undone."
  confirmLabel={isDeleting ? "Deleting..." : "Delete"}
  confirmDisabled={isDeleting}
  onConfirm={async () => {
    try {
      await onDelete(source.id);
      toast.success("Source deleted");
      setConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "Failed to delete source",
      );
    }
  }}
/>
    </>
  );
}