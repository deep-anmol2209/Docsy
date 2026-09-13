"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Artifact } from "@/types";

const POLL_INTERVAL_MS = 3000;

/**
 * Lists a workspace's artifacts and self-polls only while at least one is
 * still `GENERATING` — using TanStack Query.
 */
export function useArtifacts(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["artifacts", workspaceId];

  const artifactsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      return apiClient.get<Artifact[]>(`/api/workspaces/${workspaceId}/artifacts`);
    },
    enabled: Boolean(workspaceId),
    refetchInterval: (query) => {
      const artifacts = query.state.data;
      if (!artifacts || artifacts.length === 0) {
        return false;
      }
      const hasActive = artifacts.some((artifact) => artifact.status === "GENERATING");
      return hasActive ? POLL_INTERVAL_MS : false;
    },
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: (artifactId: string) =>
      apiClient.delete(`/api/workspaces/${workspaceId}/artifacts/${artifactId}`),

    onMutate: async (artifactId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Artifact[]>(queryKey);

      queryClient.setQueryData<Artifact[]>(queryKey, (prev) =>
        prev?.filter((artifact) => artifact.id !== artifactId) ?? []
      );

      return { previous };
    },

    onError: (_err, _artifactId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Artifact[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ artifactId, isPinned }: { artifactId: string; isPinned: boolean }) =>
      apiClient.patch<Artifact>(
        `/api/workspaces/${workspaceId}/artifacts/${artifactId}`,
        { isPinned },
      ),

    onMutate: async ({ artifactId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Artifact[]>(queryKey);

      queryClient.setQueryData<Artifact[]>(queryKey, (prev) =>
        prev?.map((a) => (a.id === artifactId ? { ...a, isPinned } : a)) ?? []
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Artifact[]>(queryKey, context.previous);
      }
    },

    onSuccess: (updatedArtifact, { artifactId }) => {
      if (updatedArtifact) {
        queryClient.setQueryData<Artifact[]>(queryKey, (prev) =>
          prev?.map((a) => (a.id === artifactId ? updatedArtifact : a)) ?? []
        );
        queryClient.setQueryData<Artifact>(
          ["artifact", workspaceId, artifactId],
          updatedArtifact
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteArtifact = async (artifactId: string) => {
    await deleteArtifactMutation.mutateAsync(artifactId);
  };

  const togglePin = async (artifactId: string, isPinned: boolean) => {
    return await togglePinMutation.mutateAsync({ artifactId, isPinned });
  };

  return {
    artifacts: artifactsQuery.data ?? [],
    isLoading: artifactsQuery.isLoading,
    isPending:
      artifactsQuery.isPending ||
      deleteArtifactMutation.isPending ||
      togglePinMutation.isPending,
    isFetching: artifactsQuery.isFetching,
    error:
      artifactsQuery.error instanceof Error ? artifactsQuery.error.message : null,
    refetch: artifactsQuery.refetch,
    deleteArtifact,
    togglePin,
    deleteArtifactMutation,
    togglePinMutation,
  };
}

/** Fetches a single artifact and keeps polling while it's `GENERATING`. */
export function useArtifact(workspaceId: string, artifactId: string) {
  const queryKey = ["artifact", workspaceId, artifactId];

  const artifactQuery = useQuery({
    queryKey,
    queryFn: async () => {
      return apiClient.get<Artifact>(
        `/api/workspaces/${workspaceId}/artifacts/${artifactId}`
      );
    },
    enabled: Boolean(workspaceId) && Boolean(artifactId),
    refetchInterval: (query) => {
      const artifact = query.state.data;
      if (artifact?.status === "GENERATING") {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  return {
    artifact: artifactQuery.data ?? null,
    isLoading: artifactQuery.isLoading,
    isPending: artifactQuery.isPending,
    isFetching: artifactQuery.isFetching,
    error:
      artifactQuery.error instanceof Error ? artifactQuery.error.message : null,
    refetch: artifactQuery.refetch,
  };
}
