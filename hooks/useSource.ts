

"use client";

import { useEffect } from "react";
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
      console.log("[GET SOURCES] Starting GET request before fetching sources");

      const response = await apiClient.get<{ sources: Source[] }>(
        `/api/workspaces/${workspaceId}/sources`,
      );

      console.log("[GET SOURCES] Response received. Total sources:", response.sources?.length ?? 0);
      response.sources?.forEach((source) => {
        console.log(`[GET SOURCES] id: ${source.id}, title: ${source.title}, ingestionStatus: ${source.ingestionStatus}`);
      });

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

  useEffect(() => {
    console.log(
      "[QUERY DATA] sourcesQuery.data changed -> IDs in query data:",
      sourcesQuery.data?.map((s) => s.id) ?? []
    );
  }, [sourcesQuery.data]);

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
      console.log("[URL/TEXT] onMutate started with input:", input);

      // Cancel any in-flight refetches so they don't clobber the optimistic entry
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

      console.log("[URL/TEXT] onMutate created optimistic source. ID:", optimisticSource.id, "title:", optimisticSource.title, "status:", optimisticSource.ingestionStatus);

      // Prepend the placeholder so it appears at the top
      queryClient.setQueryData<Source[]>(queryKey, (prev) => [optimisticSource, ...(prev ?? [])]);

      const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
      console.log("[CACHE] [URL/TEXT] Optimistic update setQueryData -> Current IDs in cache:", currentCacheIds);

      return { previous, optimisticId: optimisticSource.id };
    },

    onSuccess: (data: any, _input, context) => {
      const realSource: Source = data?.source ?? data;
      console.log("[URL/TEXT] onSuccess - real source ID:", realSource?.id, "status:", realSource?.ingestionStatus, "optimistic ID:", context?.optimisticId);
      if (!context || !realSource?.id) return;
      // Swap the placeholder out for the real server-returned source
      queryClient.setQueryData<Source[]>(queryKey, (prev) =>
        prev?.map((s) => (s.id === context.optimisticId ? realSource : s)) ?? []
      );

      const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
      console.log("[CACHE] [URL/TEXT] Success replacement setQueryData -> Current IDs in cache:", currentCacheIds);
    },

    onError: (_err, _input, context) => {
      console.error("[URL/TEXT] onError - error:", _err, "optimistic ID:", context?.optimisticId);
      // Roll back to the pre-mutation snapshot
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Source[]>(queryKey, context.previous);

        const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
        console.log("[CACHE] [URL/TEXT] Error rollback setQueryData -> Current IDs in cache:", currentCacheIds);
      }
    },

    onSettled: () => {
      console.log("[URL/TEXT] onSettled - running invalidateQueries");
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
      console.log("[PDF] onMutate started with file:", file.name, "title:", title);

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

      console.log("[PDF] onMutate created optimistic source. ID:", optimisticSource.id, "title:", optimisticSource.title, "status:", optimisticSource.ingestionStatus);

      queryClient.setQueryData<Source[]>(queryKey, (prev) => [optimisticSource, ...(prev ?? [])]);

      const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
      console.log("[CACHE] [PDF] Optimistic update setQueryData -> Current IDs in cache:", currentCacheIds);

      return { previous, optimisticId: optimisticSource.id };
    },

    onSuccess: (data: any, _input, context) => {
      const realSource: Source = data?.source ?? data;
      console.log("[PDF] onSuccess - real source ID:", realSource?.id, "status:", realSource?.ingestionStatus, "optimistic ID:", context?.optimisticId);
      if (!context || !realSource?.id) return;
      queryClient.setQueryData<Source[]>(queryKey, (prev) =>
        prev?.map((s) => (s.id === context.optimisticId ? realSource : s)) ?? []
      );

      const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
      console.log("[CACHE] [PDF] Success replacement setQueryData -> Current IDs in cache:", currentCacheIds);
    },

    onError: (_err, _input, context) => {
      console.error("[PDF] onError - error:", _err, "optimistic ID:", context?.optimisticId);
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Source[]>(queryKey, context.previous);

        const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
        console.log("[CACHE] [PDF] Error rollback setQueryData -> Current IDs in cache:", currentCacheIds);
      }
    },

    onSettled: () => {
      console.log("[PDF] onSettled - running invalidateQueries");
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

      const currentCacheIds = queryClient.getQueryData<Source[]>(queryKey)?.map((s) => s.id) ?? [];
      console.log("[CACHE] Delete source setQueryData -> Current IDs in cache:", currentCacheIds);
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