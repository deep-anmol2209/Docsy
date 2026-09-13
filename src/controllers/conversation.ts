import { NextRequest } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { getAuthenticatedUserId } from "@/src/utils/auth";
import type { RouteContext } from "@/src/utils/route-context";
import { parseBody, parseParams } from "@/src/utils/request-parsers";
import { workspaceIdParamSchema } from "@/src/validators/workspace-validator";
import {
  createConversationSchema,
  updateConversationSchema,
  conversationParamsSchema,
} from "@/src/validators/chat-validator";
import {
  createConversationForWorkspace,
  deleteConversationForWorkspace,
  getConversationForWorkspace,
  listConversationsForWorkspace,
  updateConversationForWorkspace,
} from "@/src/services/conversation/conversation-service";

export async function listConversations(
  req: NextRequest,
  context: RouteContext<{ id: string }> = {},
) {
  const { workspaceId: workspaceId } = await parseParams(
    context.params,
    workspaceIdParamSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  const conversations = await listConversationsForWorkspace(
    workspaceId,
    userId,
  );

  return jsonSuccess(conversations);
}
export async function createConversation(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string }> = {},
) {
  const { workspaceId } = await parseParams(
    context.params,
    workspaceIdParamSchema,
  );

  const userId = await getAuthenticatedUserId(req);

  let input = {};

  if (req.headers.get("content-length") !== "0") {
    input = await parseBody(req, createConversationSchema);
  }

  const conversation = await createConversationForWorkspace(
    workspaceId,
    userId,
    input,
  );

  return jsonSuccess(
    conversation,
    "Conversation created.",
    201,
  );
}

export async function getConversation(
  req: NextRequest,
  context: RouteContext<{ id: string; conversationId: string }> = {},
) {
  const { workspaceId: workspaceId, conversationId } = await parseParams(
    context.params,
    conversationParamsSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  const conversation = await getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  return jsonSuccess(conversation);
}

export async function updateConversation(
  req: NextRequest,
  context: RouteContext<{ id: string; conversationId: string }> = {},
) {
  const { workspaceId: workspaceId, conversationId } = await parseParams(
    context.params,
    conversationParamsSchema,
  );
  const input = await parseBody(req, updateConversationSchema);
  const userId = await getAuthenticatedUserId(req);

  const conversation = await updateConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
    input,
  );

  return jsonSuccess(conversation, "Conversation updated.");
}

export async function deleteConversation(
  req: NextRequest,
  context: RouteContext<{ id: string; conversationId: string }> = {},
) {
  const { workspaceId: workspaceId, conversationId } = await parseParams(
    context.params,
    conversationParamsSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  await deleteConversationForWorkspace(workspaceId, conversationId, userId);

  return new Response(null, { status: 204 });
}