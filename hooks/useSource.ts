
// "use client";

// import { useCallback, useEffect, useRef, useState } from "react";
// import { apiClient, ApiClientError } from "@/lib/api-client";
// import type { Source } from "@/types";
// import { TERMINAL_JOB_STATES } from "@/types";

// const POLL_INTERVAL_MS = 3000;

// export type CreateUrlOrTextSourceInput = {
//   sourceType: "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";
//   title?: string;
//   url?: string;
//   text?: string;
// };

// /**
//  * Lists a workspace's sources and self-polls only while at least one
//  * source hasn't reached a terminal `ingestionStatus` (COMPLETED/FAILED) —
//  * stops entirely once everything's settled, restarts automatically
//  * whenever a new source is added or retried.
//  */
// export function useSources(workspaceId: string) {
//   const [sources, setSources] = useState<Source[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const fetchSources = useCallback(async () => {
//     try {
//       const data = await apiClient.get<Source[]>(`/api/workspaces/${workspaceId}/sources`);
//       setSources(data);
//       setError(null);
//       return data;
//     } catch (err) {
//       setError(err instanceof ApiClientError ? err.message : "Failed to load sources.");
//       return [] as Source[];
//     } finally {
//       setIsLoading(false);
//     }
//   }, [workspaceId]);

//   useEffect(() => {
//     let cancelled = false;

//     async function poll() {
//       const data = await fetchSources();
//       if (cancelled) return;

//       const hasActive = data.some((source) => !TERMINAL_JOB_STATES.has(source.ingestionStatus));
//       if (hasActive) {
//         pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
//       }
//     }

//     poll();

//     return () => {
//       cancelled = true;
//       if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
//     };
//   }, [fetchSources]);

//   const addUrlOrTextSource = useCallback(
//     async (input: CreateUrlOrTextSourceInput) => {
//       await apiClient.post(`/api/workspaces/${workspaceId}/sources`, input);
//       await fetchSources();
//     },
//     [workspaceId, fetchSources],
//   );

//   const addPdfSource = useCallback(
//     async (file: File, title?: string) => {
//       const formData = new FormData();
//       formData.append("file", file);
//       if (title) formData.append("title", title);
//       await apiClient.post(`/api/workspaces/${workspaceId}/sources`, formData);
//       await fetchSources();
//     },
//     [workspaceId, fetchSources],
//   );

//   const deleteSource = useCallback(
//     async (sourceId: string) => {
//       await apiClient.delete(`/api/workspaces/${workspaceId}/sources/${sourceId}`);
//       setSources((prev) => prev.filter((source) => source.id !== sourceId));
//     },
//     [workspaceId],
//   );

//   const retrySource = useCallback(
//     async (sourceId: string) => {
//       await apiClient.post(`/api/workspaces/${workspaceId}/sources/${sourceId}/retry`);
//       await fetchSources();
//     },
//     [workspaceId, fetchSources],
//   );

//   return {
//     sources,
//     isLoading,
//     error,
//     refetch: fetchSources,
//     addUrlOrTextSource,
//     addPdfSource,
//     deleteSource,
//     retrySource,
//   };
// }

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { Source } from "@/types";
import { TERMINAL_JOB_STATES } from "@/types";

const POLL_INTERVAL_MS = 3000;

export type CreateUrlOrTextSourceInput = {
  workspaceId: string;
  type: "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";
  title?: string;
  url?: string;
  content?: string;
};

export function useSources(workspaceId: string) {
  const queryClient = useQueryClient();

  const queryKey = ["sources", workspaceId];

  /*
   * --------------------------------------------------
   * List sources
   * --------------------------------------------------
   */

const sourcesQuery = useQuery({
  queryKey,

  queryFn: async () => {
    console.log("fetching sources");
    
    const response = await apiClient.get<{ sources: Source[] }>(
      `/api/workspaces/${workspaceId}/sources`,
    );
console.log("response",response);

    return response.sources;
  },

  enabled: Boolean(workspaceId),

  refetchInterval: (query) => {
    const sources = query.state.data;

    if (!sources || sources.length === 0) {
      return false;
    }

    const hasActiveSource = sources.some(
      (source) =>
        !TERMINAL_JOB_STATES.has(source.ingestionStatus),
    );

    return hasActiveSource
      ? POLL_INTERVAL_MS
      : false;
  },
});
  /*
   * --------------------------------------------------
   * Add URL / Text / Markdown / YouTube
   * --------------------------------------------------
   */

  const addUrlOrTextSource = useMutation({
    mutationFn: (input: CreateUrlOrTextSourceInput) =>
      apiClient.post<Source>(`/api/workspaces/${workspaceId}/sources`, {
        ...input,
        ingestionStatus: "QUEUED",
      }),
     
     
    onMutate: async (input) => {
      // Cancel any in-flight refetches so they don't clobber the optimistic entry
      console.log("input: ",input);
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the current list so we can roll back on error
      const previous = queryClient.getQueryData<Source[]>(queryKey);

      // Build a temporary optimistic source entry
      const optimisticSource: Source = {
        id: `optimistic-${Date.now()}`,
        workspaceId,
        type: input.type,
        title: input.title ?? input.url ?? input.content?.slice(0, 60) ?? "New source",
        url: input.url ?? null,
        content: input.content ?? null,
        originalReference: null,
        storageLocation: null,
        mimeType: null,
        fileSizeBytes: null,
        ingestionStatus: "QUEUED",
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Prepend the placeholder so it appears at the top
      queryClient.setQueryData<Source[]>(queryKey, (prev) => [optimisticSource, ...(prev ?? [])]);

      return { previous, optimisticId: optimisticSource.id };
    },

    onSuccess: (data: any, _input, context) => {
      const realSource: Source = data?.source ?? data;
      if (!context || !realSource?.id) return;
      // Swap the placeholder out for the real server-returned source
      queryClient.setQueryData<Source[]>(queryKey, (prev) =>
        prev?.map((s) => (s.id === context.optimisticId ? realSource : s)) ?? []
      );
    },

    onError: (_err, _input, context) => {
      // Roll back to the pre-mutation snapshot
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Source[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      // Re-sync from the server so we have the authoritative state
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /*
   * --------------------------------------------------
   * Add PDF
   * --------------------------------------------------
   */

  const addPdfSource = useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      return apiClient.post<Source>(`/api/workspaces/${workspaceId}/sources`, formData);
    },

    onMutate: async ({ file, title }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Source[]>(queryKey);

      const optimisticSource: Source = {
        id: `optimistic-${Date.now()}`,
        workspaceId,
        type: "PDF",
        title: title || file.name,
        url: null,
        content: null,
        originalReference: null,
        storageLocation: null,
        mimeType: "application/pdf",
        fileSizeBytes: file.size,
        ingestionStatus: "QUEUED",
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Source[]>(queryKey, (prev) => [optimisticSource, ...(prev ?? [])]);

      return { previous, optimisticId: optimisticSource.id };
    },

    onSuccess: (data: any, _input, context) => {
      const realSource: Source = data?.source ?? data;
      if (!context || !realSource?.id) return;
      queryClient.setQueryData<Source[]>(queryKey, (prev) =>
        prev?.map((s) => (s.id === context.optimisticId ? realSource : s)) ?? []
      );
    },

    onError: (_err, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Source[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /*
   * --------------------------------------------------
   * Delete source
   * --------------------------------------------------
   */

  const deleteSource = useMutation({
    mutationFn: (sourceId: string) =>
      apiClient.delete(
        `/api/workspaces/${workspaceId}/sources/${sourceId}`,
      ),

    onSuccess: (_, sourceId) => {
      queryClient.setQueryData<Source[]>(
        queryKey,
        (previous) =>
          previous?.filter(
            (source) => source.id !== sourceId,
          ) ?? [],
      );
    },
  });

  /*
   * --------------------------------------------------
   * Retry source
   * --------------------------------------------------
   */

  const retrySource = useMutation({
    mutationFn: (sourceId: string) =>
      apiClient.post(
        `/api/workspaces/${workspaceId}/sources/${sourceId}/retry`,
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  return {
    sources: sourcesQuery.data ?? [],
    isPending: sourcesQuery.isPending || addUrlOrTextSource.isPending || addPdfSource.isPending || deleteSource.isPending || retrySource.isPending,
    isLoading: sourcesQuery.isLoading,

    isFetching: sourcesQuery.isFetching,

    error:
      sourcesQuery.error instanceof Error
        ? sourcesQuery.error.message
        : null,

    refetch: sourcesQuery.refetch,

    addUrlOrTextSource,

    addPdfSource,

    deleteSource,

    retrySource,
  };
}