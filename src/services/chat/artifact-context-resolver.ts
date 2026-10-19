import type { Message } from "@/lib/generated/prisma/client";
import { MessageRole } from "@/lib/generated/prisma/enums";
import {
  extractMessageText,
  isArtifactPlaceholderMessage,
} from "@/src/utils/message-content";

const REFERENTIAL_REQUEST_PATTERN =
  /\b(this|that|it|these|those|above|from this|from that|based on this|based on that|on this|on that)\b/i;
const EXPLICIT_TOPIC_PATTERN =
  /\b(?:about|on|from|based on|regarding|concerning|for)\s+(?!this\b|that\b|it\b|these\b|those\b|the above\b)[^\s.,!?]+/i;

type Citation = { sourceId?: unknown };

function sourceIdsFromCitations(citations: unknown): string[] {
  if (!Array.isArray(citations)) return [];

  return Array.from(
    new Set(
      citations
        .map((citation) =>
          citation && typeof citation === "object"
            ? (citation as Citation).sourceId
            : undefined,
        )
        .filter((sourceId): sourceId is string => typeof sourceId === "string" && sourceId.length > 0),
    ),
  );
}

/**
 * Resolves only conversational references. Explicit topics remain untouched so
 * they continue through normal workspace-wide hybrid retrieval.
 */
export function resolveArtifactContext(params: {
  request: string;
  recentMessages: Message[];
}): { resolvedQuery?: string; resolvedContent?: string; sourceIds?: string[] } {
  if (
    !REFERENTIAL_REQUEST_PATTERN.test(params.request) ||
    EXPLICIT_TOPIC_PATTERN.test(params.request)
  ) {
    return {};
  }

  for (let index = params.recentMessages.length - 1; index >= 0; index -= 1) {
    const assistantMessage = params.recentMessages[index];

    if (
      assistantMessage.role !== MessageRole.ASSISTANT ||
      isArtifactPlaceholderMessage(assistantMessage)
    ) continue;

    const sourceIds = sourceIdsFromCitations(assistantMessage.citations);
    const resolvedContent = extractMessageText(assistantMessage.content).trim();

    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
      const previousMessage = params.recentMessages[previousIndex];
      if (previousMessage.role !== MessageRole.USER) continue;

      const resolvedQuery = extractMessageText(previousMessage.content).trim();
      if (resolvedQuery || resolvedContent) {
        return {
          ...(resolvedQuery ? { resolvedQuery } : {}),
          ...(resolvedContent ? { resolvedContent } : {}),
          ...(sourceIds.length > 0 ? { sourceIds } : {}),
        };
      }
    }
  }

  return {};
}