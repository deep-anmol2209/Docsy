"use client";

import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ArtifactCard } from "@/components/artifacts/artifacts-card";
import { ArtifactGridSkeleton } from "@/components/artifacts/artifact-grid-skeleton";
import { useArtifacts } from "@/hooks/useArtifact";

export function ArtifactManagement({ workspaceId }: { workspaceId: string }) {
  const { artifacts, isLoading, error, deleteArtifact, togglePin } = useArtifacts(workspaceId);

  if (isLoading && artifacts.length === 0) {
    return <ArtifactGridSkeleton />;
  }

  if (error) {
    return <EmptyState icon={<Sparkles />} title="Failed to load artifacts" description={error} />;
  }

  if (artifacts.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="No artifacts yet"
        description="Ask for a summary, study guide, quiz, or other artifact from chat — generated artifacts will appear here."
      />
    );
  }

  // Pinned first, otherwise most recent first (API already sorts by createdAt desc).
  const sorted = [...artifacts].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          workspaceId={workspaceId}
          artifact={artifact}
          onDelete={deleteArtifact}
          onTogglePin={togglePin}
        />
      ))}
    </div>
  );
}