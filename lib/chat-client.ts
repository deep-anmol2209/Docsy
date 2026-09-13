

/**
 * Dedicated client for the chat-send endpoint — NOT `apiClient`, because
 * this endpoint doesn't always return JSON: a normal chat turn streams
 * plain text token-by-token, while a message routed to artifact
 * generation instead returns a 202 with `{intent, artifact}` JSON.
 */

import { ApiClientError } from "@/lib/api-client";
import type { Artifact, ChatIntent } from "@/types";

export type ChatStreamResult =
  | { type: "chat"; text: string }
  | { type: "artifact"; intent: ChatIntent; artifact: Artifact };

export async function sendChatMessage(params: {
  workspaceId: string;
  conversationId: string;
  message: string;
  onChunk: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<ChatStreamResult> {
  const response = await fetch(
    `/api/workspaces/${params.workspaceId}/conversations/${params.conversationId}/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: params.message }),
      signal: params.signal,
    },
  );

  // Message was routed to artifact generation instead of a normal reply.
  if (response.status === 202) {
    const json = await response.json();
    if (!json.success) {
      throw new ApiClientError(json.message, response.status, json.details);
    }
    return { type: "artifact", intent: json.data.intent, artifact: json.data.artifact };
  }

  if (!response.ok) {
    let message = response.statusText;
    let details: unknown;
    try {
      const json = await response.json();
      message = json.message ?? message;
      details = json.details;
    } catch {
      // Non-JSON error body — fall back to statusText already set above.
    }
    throw new ApiClientError(message, response.status, details);
  }

  if (!response.body) {
    throw new ApiClientError("No response body", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    params.onChunk(chunk);
  }

  return { type: "chat", text: fullText };
}
