import * as conversationRepository from "@/src/repositories/conversation-repository";
import type {
  CreateConversationInput,
  UpdateConversationInput,
} from "@/src/validators/chat-validator";
import { NotFoundError } from "@/src/errors/app-error";

export async function listConversationsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  return conversationRepository.listConversationsForWorkspace(
    workspaceId,
    userId,
  );
}

export async function getConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  const conversation = await conversationRepository.getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return conversation;
}

export async function createConversationForWorkspace(
  workspaceId: string,
  userId: string,
  input: CreateConversationInput,
) {
  const conversation = await conversationRepository.createConversationForWorkspace(
    workspaceId,
    userId,
    input,
  );

  if (!conversation) {
    throw new NotFoundError("Workspace not found.");
  }

  return conversation;
}

export async function updateConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
  input: UpdateConversationInput,
) {
  const conversation = await conversationRepository.updateConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
    input,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return conversation;
}

export async function deleteConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  const deleted = await conversationRepository.deleteConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  if (!deleted) {
    throw new NotFoundError("Conversation not found.");
  }
}