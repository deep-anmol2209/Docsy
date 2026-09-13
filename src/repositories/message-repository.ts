import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { MessageRole } from "@/lib/generated/prisma/enums";

/**
 * Message persistence.
 *
 * Messages are always accessed through their parent conversation, so
 * authorization is enforced one level up by the conversation
 * repository/service before any of these functions are called.
 */

export async function listMessagesForConversation(
  conversationId: string,
  options: { limit: number; before?: Date },
) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(options.before ? { createdAt: { lt: options.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });

  // Stored/queried newest-first (for "before" cursor pagination),
  // returned oldest-first for natural chat rendering order.
  return messages.reverse();
}

/**
 * Most recent N messages for a conversation, oldest-first — used to build
 * the recent-message window for chat context (see `RECENT_MESSAGE_WINDOW`).
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number,
) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse();
}

/**
 * Messages not yet folded into the conversation summary, oldest-first.
 * `afterMessageCount` is `Conversation.summaryMessageCount`.
 */
export async function getMessagesSinceSummary(
  conversationId: string,
  afterMessageCount: number,
) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    skip: afterMessageCount,
  });
}

export async function countMessagesForConversation(conversationId: string) {
  return prisma.message.count({ where: { conversationId } });
}

export async function createMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: Prisma.InputJsonValue;
  citations?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  model?: string;
  tokenUsage?: Prisma.InputJsonValue;

}) {
  return prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      citations: input.citations,
      metadata: input.metadata,
      model: input.model,
      tokenUsage: input.tokenUsage,
    },
  });
}

export async function deleteMessage(messageId: string){
  return prisma.message.delete({
    where: {
      id: messageId,
    }
  })
}