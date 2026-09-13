"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Loader2, ExternalLink, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useArtifact } from "@/hooks/useArtifact";
import { ArtifactTypeIcon, ARTIFACT_TYPE_LABELS } from "@/components/artifacts/artifact-type-icons";

export function ArtifactMessageCard({
  workspaceId,
  artifactId,
}: {
  workspaceId: string;
  artifactId: string;
}) {
  const router = useRouter();
  const { artifact } = useArtifact(workspaceId, artifactId);

  const status = artifact?.status ?? "GENERATING";
  const typeLabel = artifact ? (ARTIFACT_TYPE_LABELS[artifact.type] ?? "Artifact") : "Artifact";

  return (
    <Card className="mt-3 w-full max-w-md">
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {status === "GENERATING" ? (
            <Sparkles className="size-4 animate-pulse text-primary" />
          ) : status === "FAILED" ? (
            <XCircle className="size-4 text-destructive" />
          ) : (
            <ArtifactTypeIcon type={artifact?.type ?? "CUSTOM"} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {artifact?.title ?? `Generating ${typeLabel.toLowerCase()}...`}
          </p>

          <p className="text-xs text-muted-foreground">
            {status === "GENERATING" && `Generating ${typeLabel.toLowerCase()}...`}
            {status === "READY" && "Ready to view"}
            {status === "FAILED" && "Generation failed"}
          </p>
        </div>

        {status === "GENERATING" && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}

        {status === "READY" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/notebooks/${workspaceId}/artifacts/${artifactId}`)}
          >
            <ExternalLink className="mr-1.5 size-3.5" />
            Open
          </Button>
        )}
      </div>
    </Card>
  );
}