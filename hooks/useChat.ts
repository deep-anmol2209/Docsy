"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { sendChatMessage } from "@/lib/chat-client";
import type { Message } from "@/types";

/**
 * Owns a single conversation's message history + the in-flight streaming
 * turn using TanStack Query for server state management.
 *
 * Optimistically appends the user's message immediately upon send, then
 * streams the assistant response, and reconciles with authoritative server state
 * upon turn completion.
 */
export function useChat(workspaceId: string, conversationId: string | null) {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const queryKey = ["messages", workspaceId, conversationId];

  const messagesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!conversationId) return [];
      return apiClient.get<Message[]>(
        `/api/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      );
    },
    enabled: Boolean(workspaceId) && Boolean(conversationId),
    staleTime: 1000 * 60 * 5,
  });

  const loadMessages = useCallback(async () => {
    if (conversationId) {
      await queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, queryKey, conversationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!conversationId || !trimmed || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setStreamingText("");

      const optimisticUserMessage: Message = {
        id: `temp-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        conversationId,
        role: "USER",
        content: { text: trimmed },
        citations: null,
        metadata: null,
        model: null,
        tokenUsage: null,
        createdAt: new Date().toISOString(),
      };

      // Immediately append user's message to cache
      queryClient.setQueryData<Message[]>(queryKey, (prev) => [
        ...(prev ?? []),
        optimisticUserMessage,
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await sendChatMessage({
          workspaceId,
          conversationId,
          message: trimmed,
          onChunk: (delta) => setStreamingText((prev) => (prev ?? "") + delta),
          signal: controller.signal,
        });

        await queryClient.invalidateQueries({ queryKey });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          await queryClient.invalidateQueries({ queryKey });
        } else {
          const errorMessageText =
            err instanceof ApiClientError
              ? err.message
              : "Failed to generate a response.";

          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            conversationId,
            role: "ASSISTANT",
            content: {
              text: errorMessageText,
            },
            citations: null,
            metadata: {
              error: {
                retryable: true,
              },
            },
            model: null,
            tokenUsage: null,
            createdAt: new Date().toISOString(),
          };

          queryClient.setQueryData<Message[]>(queryKey, (prev) => [
            ...(prev ?? []),
            errorMessage,
          ]);

          setError(null);
        }
      } finally {
        setIsStreaming(false);
        setStreamingText(null);
        abortControllerRef.current = null;
      }
    },
    [workspaceId, conversationId, isStreaming, queryClient, queryKey],
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const isLoadingHistory = Boolean(conversationId) && (messagesQuery.isLoading && !messagesQuery.data);

  return {
    messages: messagesQuery.data ?? [],
    isLoadingHistory,
    streamingText,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    refetch: loadMessages,
  };
}
