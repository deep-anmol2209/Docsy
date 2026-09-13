import * as messageRepository from "@/src/repositories/message-repository";
import * as conversationService from "@/src/services/conversation/conversation-service";
import type { ListMessagesQuery } from "@/src/validators/chat-validator";

/**
 * Lists messages for a conversation, oldest-first.
 *
 * Ownership is verified via `conversationService.getConversationForWorkspace`
 * (throws `NotFoundError` if the conversation doesn't exist or isn't owned
 * by `userId`) before any messages are read.
 */
export async function listMessagesForConversation(
  workspaceId: string,
  conversationId: string,
  userId: string,
  query: ListMessagesQuery,
) {
  await conversationService.getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  return messageRepository.listMessagesForConversation(conversationId, {
    limit: query.limit,
    before: query.before ? new Date(query.before) : undefined,
  });
}