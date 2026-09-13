/**
 * Assembles the final message array sent to the LLM:
 *
 *   System instructions
 *   + Conversation summary (if any)
 *   + Retrieved notebook chunks (if any)
 *   + Recent conversation messages (token-budget trimmed, oldest dropped first)
 *   + Current user message
 *
 * Retrieved source context is presented with higher authority than
 * anything else — see `SYSTEM_INSTRUCTIONS` — and user-level memory
 * (Mem0, added in a later phase) is intentionally not part of this
 * function's inputs yet.
 */

import type { Message as PrismaMessage } from "@/lib/generated/prisma/client";
import { MessageRole } from "@/lib/generated/prisma/enums";
import { CONTEXT_TOKEN_BUDGET } from "@/lib/ai-config";
import {
  CHAT_SYSTEM_INSTRUCTIONS,
  CONVERSATION_SUMMARY_CONTEXT_PREFIX,
  NO_NOTEBOOK_CONTEXT_MESSAGE,
  NOTEBOOK_CONTEXT_BLOCK_PREFIX,
  USER_MEMORY_CONTEXT_PREFIX,
} from "@/src/config/prompts";
import type { RetrievedChunk } from "@/src/services/retrival/retrival-service";
import { extractMessageText } from "@/src/utils/message-content";
import { formatRetrievedChunk } from "@/src/services/retrival/format-chunk";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildChatMessages(params: {
  /** Oldest-first. */
  recentMessages: PrismaMessage[];
  conversationSummary?: string | null;
  retrievedChunks: RetrievedChunk[];
  /** Durable user preferences/facts from Mem0 — lowest factual authority, see `SYSTEM_INSTRUCTIONS`. */
  userMemories?: string[];
  userMessage: string;
}): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let usedTokens = 0;

  messages.push({ role: "system", content: CHAT_SYSTEM_INSTRUCTIONS });
  usedTokens += estimateTokens(CHAT_SYSTEM_INSTRUCTIONS);

  if (params.userMemories && params.userMemories.length > 0) {
    const block = `${USER_MEMORY_CONTEXT_PREFIX}\n${params.userMemories
      .map((memory) => `- ${memory}`)
      .join("\n")}`;
    messages.push({ role: "system", content: block });
    usedTokens += estimateTokens(block);
  }

  if (params.conversationSummary) {
    const block = `${CONVERSATION_SUMMARY_CONTEXT_PREFIX}\n${params.conversationSummary}`;
    messages.push({ role: "system", content: block });
    usedTokens += estimateTokens(block);
  }

  if (params.retrievedChunks.length > 0) {
    const block = `${NOTEBOOK_CONTEXT_BLOCK_PREFIX}\n\n${params.retrievedChunks
      .map(formatRetrievedChunk)
      .join("\n\n")}`;
    messages.push({ role: "system", content: block });
    usedTokens += estimateTokens(block);
  } else {
    messages.push({ role: "system", content: NO_NOTEBOOK_CONTEXT_MESSAGE });
    usedTokens += estimateTokens(NO_NOTEBOOK_CONTEXT_MESSAGE);
  }

  const userTokens = estimateTokens(params.userMessage);
  const budgetForHistory = Math.max(
    0,
    CONTEXT_TOKEN_BUDGET - usedTokens - userTokens,
  );

  const historyMessages: ChatMessage[] = [];
  let historyTokens = 0;

  for (let i = params.recentMessages.length - 1; i >= 0; i--) {
    const message = params.recentMessages[i];

    if (message.role !== MessageRole.USER && message.role !== MessageRole.ASSISTANT) {
      continue;
    }

    const text = extractMessageText(message.content);
    if (!text) continue;

    const tokens = estimateTokens(text);
    if (historyTokens + tokens > budgetForHistory) break;

    historyTokens += tokens;
    historyMessages.unshift({
      role: message.role === MessageRole.ASSISTANT ? "assistant" : "user",
      content: text,
    });
  }

  messages.push(...historyMessages);
  messages.push({ role: "user", content: params.userMessage });

  return messages;
}