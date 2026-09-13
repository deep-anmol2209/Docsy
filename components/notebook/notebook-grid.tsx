
"use client";

import { useState } from "react";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { NotebookCard } from "@/components/notebook/notebook-card";
import { NotebookGridSkeleton } from "@/components/notebook/notebook-grid-skeleton";
import { CreateNotebookDialog } from "@/components/notebook/create-notebook-dialog";
import { BrandMark } from "@/components/shared/brand-mark";
import { useWorkspaces } from "@/hooks/useWorkspace";

export function NotebookGrid() {
  const { workspaces, isLoading, error } = useWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading && workspaces.length === 0) {
    return <NotebookGridSkeleton />;
  }

  if (error) {
    return <EmptyState icon={<Library />} title="Failed to load notebooks" description={error} />;
  }

  if (workspaces.length === 0) {
    return (
      <>
        <EmptyState
          icon={<BrandMark className="size-5" />}
          title="Your research workspace is empty"
          description="Create your first notebook and start building your personal knowledge base."
          action={<Button onClick={() => setCreateOpen(true)}>Create notebook</Button>}
        />
        <CreateNotebookDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((workspace) => (
        <NotebookCard key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
