"use client";

import { useState } from "react";
import { Plus, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceCard } from "@/components/sources/source-card";
import { SourceGridSkeleton } from "@/components/sources/source-grid-skeleton";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { useSources } from "@/hooks/useSource";

export function SourceManagement({ workspaceId }: { workspaceId: string }) {
  const { sources, isLoading, deleteSource, isPending,  retrySource, error } = useSources(workspaceId);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {sources.length > 0 ? `${sources.length} source${sources.length === 1 ? "" : "s"}` : "Sources"}
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="size-3.5" />
          Add source
        </Button>
      </div>

      {isLoading && sources.length === 0 ? (
        <SourceGridSkeleton />
      ) : error ? (
        <EmptyState icon={<FileStack />} title="Failed to load sources" description={error} />
      ) : sources.length === 0 ? (
        <EmptyState
          icon={<FileStack />}
          title="Add your first source"
          description="Bring PDFs, websites, videos, and other supported sources into this notebook."
          action={<Button onClick={() => setAddOpen(true)}>Add source</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:grid-cols-3">
          {sources.map((source) => (
           <SourceCard
  key={source.id}
  source={source}
  onDelete={async (sourceId) => {
    await deleteSource.mutateAsync(sourceId);
  }}
  onRetry={async (sourceId) => {
    await retrySource.mutateAsync(sourceId);
  }}
  isDeleting={deleteSource.isPending}
  isRetrying={retrySource.isPending}
/>
          ))}
        </div>
      )}

      <AddSourceDialog workspaceId={workspaceId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}