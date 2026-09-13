"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Conversation } from "@/types";

export function useConversations(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["conversations", workspaceId];

  const conversationsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      return apiClient.get<Conversation[]>(
        `/api/workspaces/${workspaceId}/conversations`,
      );
    },
    enabled: Boolean(workspaceId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const createConversationMutation = useMutation({
    mutationFn: (title?: string) =>
      apiClient.post<Conversation>(
        `/api/workspaces/${workspaceId}/conversations`,
        title ? { title } : undefined,
      ),
    onSuccess: (created) => {
      queryClient.setQueryData<Conversation[]>(queryKey, (prev) => [
        created,
        ...(prev ?? []),
      ]);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiClient.delete(`/api/workspaces/${workspaceId}/conversations/${conversationId}`),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<Conversation[]>(queryKey, (prev) =>
        prev?.filter((c) => c.id !== conversationId) ?? [],
      );
    },
  });

  const createConversation = async (title?: string) => {
    return createConversationMutation.mutateAsync(title);
  };

  const deleteConversation = async (conversationId: string) => {
    return deleteConversationMutation.mutateAsync(conversationId);
  };

  return {
    conversations: conversationsQuery.data ?? [],
    isLoading: conversationsQuery.isLoading,
    isPending:
      conversationsQuery.isPending ||
      createConversationMutation.isPending ||
      deleteConversationMutation.isPending,
    isFetching: conversationsQuery.isFetching,
    error:
      conversationsQuery.error instanceof Error
        ? conversationsQuery.error.message
        : null,
    refetch: conversationsQuery.refetch,
    createConversation,
    deleteConversation,
    createConversationMutation,
    deleteConversationMutation,
  };
}
