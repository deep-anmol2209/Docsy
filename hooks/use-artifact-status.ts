"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Artifact } from "@/types";

const POLL_INTERVAL_MS = 2000;

/**
 * Polls a single artifact until it leaves `GENERATING` using TanStack Query.
 */
export function useArtifactStatus(
  workspaceId: string,
  artifactId: string,
  initialArtifact: Artifact,
) {
  const queryKey = ["artifact", workspaceId, artifactId];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiClient.get<Artifact>(
        `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
      ),
    initialData: initialArtifact,
    enabled: Boolean(workspaceId) && Boolean(artifactId),
    refetchInterval: (q) => {
      const data = q.state.data;
      return data?.status === "GENERATING" ? POLL_INTERVAL_MS : false;
    },
  });

  return query.data ?? initialArtifact;
}