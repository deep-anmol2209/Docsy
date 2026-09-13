
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SourceTypeIcon } from "@/components/sources/source-type-icons";
import { SourceProgressChecklist } from "@/components/sources/source-progress";
import { JOB_STATE_LABELS } from "@/src/utils/job-progress";
import type { Source } from "@/types";

function formatBytes(bytes?: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function SourceDetailsDialog({
  source,
  open,
  onOpenChange,
}: {
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const latestJob = source.jobs?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SourceTypeIcon type={source.type} className="text-muted-foreground" />
            <span className="truncate">{source.title}</span>
          </DialogTitle>
          <DialogDescription className="truncate">
            {source.url ?? source.originalReference ?? source.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{source.type}</Badge>
            {source.mimeType && <Badge variant="outline">{source.mimeType}</Badge>}
            {formatBytes(source.fileSizeBytes) && (
              <Badge variant="outline">{formatBytes(source.fileSizeBytes)}</Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-1.5 text-muted-foreground">
            <dt>Status</dt>
            <dd className="text-right text-foreground">{JOB_STATE_LABELS[source.ingestionStatus]}</dd>
            <dt>Added</dt>
            <dd className="text-right text-foreground">
              {new Date(source.createdAt).toLocaleString()}
            </dd>
          </dl>

          {source.ingestionStatus !== "COMPLETED" && (
            <div className="rounded-lg border border-border/60 p-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Processing</p>
              <SourceProgressChecklist state={source.ingestionStatus} />
              {source.ingestionStatus === "FAILED" && latestJob?.failureReason && (
                <p className="mt-3 rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                  {latestJob.failureReason}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
