
// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { apiClient, ApiClientError } from "@/lib/api-client";
// import type { Workspace } from "@/types";

// export function useWorkspaces() {
//   const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const refetch = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const data = await apiClient.get<Workspace[]>("/api/workspaces");
//       setWorkspaces(data);
//     } catch (err) {
//       setError(err instanceof ApiClientError ? err.message : "Failed to load notebooks.");
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     refetch();
//   }, [refetch]);

//   const createWorkspace = useCallback(
//     async (input: { title: string; description?: string }) => {
//       const created = await apiClient.post<Workspace>("/api/workspaces", input);
//       setWorkspaces((prev) => [created, ...prev]);
//       return created;
//     },
//     [],
//   );

//   const updateWorkspace = useCallback(
//     async (id: string, input: { title?: string; description?: string }) => {
//       const updated = await apiClient.patch<Workspace>(`/api/workspaces/${id}`, input);
//       setWorkspaces((prev) => prev.map((workspace) => (workspace.id === id ? updated : workspace)));
//       return updated;
//     },
//     [],
//   );

//   const deleteWorkspace = useCallback(async (id: string) => {
//     await apiClient.delete(`/api/workspaces/${id}`);
//     setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id));
//   }, []);

//   return { workspaces, isLoading, error, refetch, createWorkspace, updateWorkspace, deleteWorkspace };
// }


"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Workspace } from "@/types";

type CreateWorkspaceInput = {
  title: string;
  description?: string;
};

type UpdateWorkspaceInput = {
  title?: string;
  description?: string;
};

export function useWorkspaces() {
  const queryClient = useQueryClient();

  const queryKey = ["workspaces"];

  // --------------------------------------------------
  // List Workspaces
  // --------------------------------------------------

  const workspacesQuery = useQuery({
    queryKey,

    queryFn: () =>
      apiClient.get<Workspace[]>(
        "/api/workspaces",
      ),
  });

  // --------------------------------------------------
  // Create Workspace
  // --------------------------------------------------

  const createWorkspace = useMutation({
    mutationFn: (
      input: CreateWorkspaceInput,
    ) =>
      apiClient.post<Workspace>(
        "/api/workspaces",
        input,
      ),

    onSuccess: (createdWorkspace) => {
      queryClient.setQueryData<Workspace[]>(
        queryKey,
        (previous) => [
          createdWorkspace,
          ...(previous ?? []),
        ],
      );
    },
  });

  // --------------------------------------------------
  // Update Workspace
  // --------------------------------------------------

  const updateWorkspace = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateWorkspaceInput;
    }) =>
      apiClient.patch<Workspace>(
        `/api/workspaces/${id}`,
        input,
      ),

    onSuccess: (updatedWorkspace) => {
      queryClient.setQueryData<Workspace[]>(
        queryKey,
        (previous) =>
          previous?.map((workspace) =>
            workspace.id === updatedWorkspace.id
              ? updatedWorkspace
              : workspace,
          ) ?? [],
      );
    },
  });

  // --------------------------------------------------
  // Delete Workspace
  // --------------------------------------------------

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(
        `/api/workspaces/${id}`,
      ),

    onSuccess: (_, deletedWorkspaceId) => {
      queryClient.setQueryData<Workspace[]>(
        queryKey,
        (previous) =>
          previous?.filter(
            (workspace) =>
              workspace.id !== deletedWorkspaceId,
          ) ?? [],
      );
    },
  });

  // --------------------------------------------------
  // Return API
  // --------------------------------------------------

  return {
    workspaces: workspacesQuery.data ?? [],

    isLoading: workspacesQuery.isLoading,

    isFetching: workspacesQuery.isFetching,

    error:
      workspacesQuery.error instanceof Error
        ? workspacesQuery.error.message
        : null,

    refetch: workspacesQuery.refetch,

    createWorkspace,

    updateWorkspace,

    deleteWorkspace,
  };
}



export function useWorkspace(workspaceId: string) {
  const query = useQuery({
    queryKey: ["workspace", workspaceId],

    queryFn: () =>
      apiClient.get<Workspace>(
        `/api/workspaces/${workspaceId}`,
      ),

    enabled: Boolean(workspaceId),
  });

  return {
    workspace: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error.message
        : null,
    refetch: query.refetch,
  };
}