import { NextRequest } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { getAuthenticatedUserId } from "@/src/utils/auth";
import type { RouteContext } from "@/src/utils/route-context";
import { parseBody, parseParams } from "@/src/utils/request-parsers";
import {
  conversationParamsSchema,
  sendMessageSchema,
} from "@/src/validators/chat-validator";
import { streamChatResponse } from "@/src/services/chat/chat-service";
import { artifactTypeForIntent, detectIntent } from "@/src/services/chat/intent-service";
import { requestArtifactGeneration } from "@/src/services/artifact/artifact-service";
import * as conversationService from "@/src/services/conversation/conversation-service";
import * as messageRepository from "@/src/repositories/message-repository";
import { MessageRole } from "@/lib/generated/prisma/enums";
import { CHAT_RATE_LIMIT, ARTIFACT_RATE_LIMIT } from "@/lib/ai-config";
import { checkRateLimit } from "@/src/utils/rate-limiter";
import { createMessage } from "@/src/repositories/message-repository";
import { resolveArtifactContext } from "@/src/services/chat/artifact-context-resolver";
export async function sendMessage(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string; conversationId: string }> = {},
) {
  const { workspaceId, conversationId } = await parseParams(
    context.params,
    conversationParamsSchema,
  );
  const { message } = await parseBody(req, sendMessageSchema);
  const userId = await getAuthenticatedUserId(req);

  checkRateLimit(`chat:${userId}`, CHAT_RATE_LIMIT);

  await conversationService.getConversationForWorkspace(
    workspaceId,
    conversationId,
    userId,
  );

  const intent = detectIntent(message);

  if (intent !== "CHAT") {
    console.log("intent: ", intent);
    return handleArtifactRequest({ workspaceId, conversationId, userId, message, intent });
  }

  // Ownership + the user message are persisted synchronously inside
  // `streamChatResponse` before this returns, so anything wrong there
  // (bad conversationId, auth) still surfaces as a normal JSON error via
  // `withErrorHandler` rather than a broken stream.
  const stream = await streamChatResponse({
    workspaceId,
    conversationId,
    userId,
    message,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Handles a message that intent detection routed to artifact generation
 * instead of normal chat. Returns a plain JSON response (not a stream) —
 * the "response" here is a `GENERATING` artifact record, not chat tokens.
 */
async function handleArtifactRequest(params: {
  workspaceId: string;
  conversationId: string;
  userId: string;
  message: string;
  intent: ReturnType<typeof detectIntent>;
}) {
  // Artifact generation is more expensive than a chat turn (broader
  // retrieval + a bigger model) — its own, tighter limit on top of the
  // general chat limit already checked above.
  checkRateLimit(`artifact:${params.userId}`, ARTIFACT_RATE_LIMIT);

  // Verifies ownership (throws NotFoundError if not the caller's conversation).
  await conversationService.getConversationForWorkspace(
    params.workspaceId,
    params.conversationId,
    params.userId,
  );

  const recentMessages = await messageRepository.getRecentMessages(
    params.conversationId,
    20,
  );
  const resolvedContext = resolveArtifactContext({
    request: params.message,
    recentMessages,
  });

  // The request itself still belongs in conversation history, even though
  // the *response* is an artifact, not a chat message — see
  // "Do not store artifacts as Message.content" in the spec.
  await messageRepository.createMessage({
    conversationId: params.conversationId,
    role: MessageRole.USER,
    content: { text: params.message },
    metadata: { intent: params.intent },
  });

  const artifactType = artifactTypeForIntent(params.intent);

  if (!artifactType) {
    // Unreachable given the CHAT check above, but keeps this function's types honest.
    throw new Error(`No artifact type mapped for intent "${params.intent}"`);
  }

  const artifact = await requestArtifactGeneration({
    workspaceId: params.workspaceId,
    userId: params.userId,
    type: artifactType,
    generationPrompt: params.message,
    conversationId: params.conversationId,
    ...resolvedContext,
  });
await createMessage({

  
  conversationId: params.conversationId,
  role: MessageRole.ASSISTANT,
  content: {
    text: "I've started creating your artifact.",
  },
  metadata: {
    artifacts: [
      {
        artifactId: artifact.id,
        type: artifact.type,
      },
    ],
  },
});
  return jsonSuccess(
    { intent: params.intent, artifact },
    "Artifact generation started.",
    202,
  );
}