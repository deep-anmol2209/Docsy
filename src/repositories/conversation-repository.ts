// import { prisma } from "@/lib/db";

// import {
//   CreateConversationInput,
//   UpdateConversationInput,
// } from "@/src/validators/chat-validator";

// export async function listConversationsForWorkspace(
//   workspaceId: string,
//   userId: string,
// ) {
//   return prisma.conversation.findMany({
//     where: {
//       workspaceId,
//       workspace: {
//         userId,
//       },
//     },
//     orderBy: {
//       updatedAt: "desc",
//     },
//   });
// }

// export async function getConversationByIdForWorkspace(
//   workspaceId: string,
//   conversationId: string,
//   userId: string,
// ) {
//   return prisma.conversation.findFirst({
//     where: {
//       id: conversationId,
//       workspaceId,
//       workspace: {
//         userId,
//       },
//     },
//   });
// }

// export async function createConversationForWorkspace(
//   workspaceId: string,
//   userId: string,
//   input: CreateConversationInput,
// ) {
//   return prisma.conversation.create({
//     data: {
//       workspaceId,
//       title: input.title,
//     },
//   });
// }

// export async function updateConversationForWorkspace(
//   workspaceId: string,
//   conversationId: string,
//   userId: string,
//   input: UpdateConversationInput,
// ) {
//   return prisma.conversation.updateMany({
//     where: {
//       id: conversationId,
//       workspaceId,
//       workspace: {
//         userId,
//       },
//     },
//     data: input,
//   });
// }

// export async function deleteConversationForWorkspace(
//   workspaceId: string,
//   conversationId: string,
//   userId: string,
// ) {
//   return prisma.conversation.deleteMany({
//     where: {
//       id: conversationId,
//       workspaceId,
//       workspace: {
//         userId,
//       },
//     },
//   });
// }

import { prisma } from "@/lib/db";
import type {
  CreateConversationInput,
  UpdateConversationInput,
} from "@/src/validators/chat-validator";

/**
 * Conversation persistence.
 *
 * Every query is scoped to `workspaceId` AND joined through
 * `workspace.userId` so a conversation can never be read/mutated by
 * anyone other than the workspace owner, regardless of what id the
 * client supplies.
 */

export async function listConversationsForWorkspace(
  workspaceId: string,
  userId: string,
) {
  return prisma.conversation.findMany({
    where: {
      workspaceId,
      workspace: { userId },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
      workspace: { userId },
    },
  });
}

export async function createConversationForWorkspace(
  workspaceId: string,
  userId: string,
  input: CreateConversationInput,
) {
  // Guard against creating a conversation under a workspace the
  // caller does not own (create has no `where` clause to scope by).
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });

  if (!workspace) {
    return null;
  }

  return prisma.conversation.create({
    data: {
      workspaceId,
      title: input.title,
      model: input.model,
    },
  });
}

/**
 * Returns the updated conversation, or `null` if it doesn't exist / isn't
 * owned by `userId`. Uses a findFirst-then-update instead of `updateMany`
 * so the caller gets the full updated record back rather than a count.
 */
export async function updateConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
  input: UpdateConversationInput,
) {
  const existing = await getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  if (!existing) {
    return null;
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: input,
  });
}

/** Returns `true` if a conversation was deleted, `false` if it didn't exist / wasn't owned. */
export async function deleteConversationForWorkspace(
  workspaceId: string,
  conversationId: string,
  userId: string,
) {
  const existing = await getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  if (!existing) {
    return false;
  }

  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  return true;
}

/** Bumps `updatedAt` so the conversation list re-sorts after new activity. */
export async function touchConversation(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}