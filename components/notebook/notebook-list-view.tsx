
"use client";

import { useMemo, useState } from "react";
import { Search, Library, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { NotebookCard } from "@/components/notebook/notebook-card";
import { NotebookGridSkeleton } from "@/components/notebook/notebook-grid-skeleton";
import { CreateNotebookDialog } from "@/components/notebook/create-notebook-dialog";
import { BrandMark } from "@/components/shared/brand-mark";
import { useWorkspaces } from "@/hooks/useWorkspace";

export function NotebookListView() {
  const { workspaces, isLoading, error } = useWorkspaces();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return workspaces;
    const q = query.trim().toLowerCase();
    return workspaces.filter(
      (workspace) =>
        workspace.title.toLowerCase().includes(q) ||
        workspace.description?.toLowerCase().includes(q),
    );
  }, [workspaces, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notebooks..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 sm:self-auto">
          <Plus className="size-4" />
          Create notebook
        </Button>
      </div>

      {isLoading && workspaces.length === 0 ? (
        <NotebookGridSkeleton />
      ) : error ? (
        <EmptyState icon={<Library />} title="Failed to load notebooks" description={error} />
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={<BrandMark className="size-5" />}
          title="Your research workspace is empty"
          description="Create your first notebook and start building your personal knowledge base."
          action={<Button onClick={() => setCreateOpen(true)}>Create notebook</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search />} title="No notebooks match your search" description={`Nothing found for "${query}".`} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workspace) => (
            <NotebookCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}

      <CreateNotebookDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
