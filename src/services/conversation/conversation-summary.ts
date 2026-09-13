/**
 * Conversation summarization (Phase 4/7).
 *
 * Compresses messages that came in since the last summary into an
 * updated `Conversation.summary`, folding them into the *existing*
 * summary rather than starting over, so context compounds instead of
 * resetting every time.
 *
 * Runs from `src/inngest/functions/conversation-summarize.ts` — never
 * called directly from the chat request path, so a slow/failed
 * summarization never affects chat latency.
 */

import { prisma } from "@/lib/db";
import { getChatClient, openai } from "@/lib/openai";
import { CHAT_MODEL } from "@/lib/ai-config";
import { CONVERSATION_SUMMARY_SYSTEM_PROMPT } from "@/src/config/prompts";
import * as messageRepository from "@/src/repositories/message-repository";
import { extractMessageText } from "@/src/utils/message-content";
import { logger } from "@/src/utils/logger";

function buildUserPrompt(previousSummary: string | null, transcript: string): string {
  const previousBlock = previousSummary
    ? `Previous summary:\n${previousSummary}`
    : "Previous summary: (none yet — this is the first summarization pass.)";

  return `${previousBlock}\n\nNew messages to fold in:\n${transcript}`;
}

export type SummarizeConversationResult =
  | { summarized: true; summaryMessageCount: number }
  | { summarized: false; reason: "no-new-messages" | "conversation-not-found" };

export async function summarizeConversation(
  conversationId: string,
): Promise<SummarizeConversationResult> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    // Not thrown as NotFoundError: a conversation can legitimately be
    // deleted between the event being enqueued and the job running, and
    // that isn't a job failure worth retrying.
    logger.warn(`[conversation-summary] conversation ${conversationId} no longer exists; skipping.`);
    return { summarized: false, reason: "conversation-not-found" };
  }

  const newMessages = await messageRepository.getMessagesSinceSummary(
    conversationId,
    conversation.summaryMessageCount,
  );

  if (newMessages.length === 0) {
    return { summarized: false, reason: "no-new-messages" };
  }

  const transcript = newMessages
    .map((message) => `${message.role}: ${extractMessageText(message.content)}`)
    .filter((line) => line.trim().length > 0)
    .join("\n");
const client= getChatClient("groq")
  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: CONVERSATION_SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(conversation.summary, transcript) },
    ],
  });

  const newSummary = completion.choices[0]?.message?.content?.trim();

  if (!newSummary) {
    throw new Error(`[conversation-summary] Empty summary returned for conversation ${conversationId}`);
  }

  const summaryMessageCount = conversation.summaryMessageCount + newMessages.length;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      summary: newSummary,
      summaryMessageCount,
      summarizedAt: new Date(),
    },
  });

  return { summarized: true, summaryMessageCount };
}

export async function conversationExists(conversationId: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });

  return conversation !== null;
}