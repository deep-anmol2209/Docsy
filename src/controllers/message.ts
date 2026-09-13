import { NextRequest } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { getAuthenticatedUserId } from "@/src/utils/auth";
import type { RouteContext } from "@/src/utils/route-context";
import { parseParams } from "@/src/utils/request-parsers";
import {
  conversationParamsSchema,
  listMessagesQuerySchema,
} from "@/src/validators/chat-validator";
import { listMessagesForConversation } from "@/src/services/message-service";

export async function listMessages(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string; conversationId: string }> = {},
) {
  const { workspaceId, conversationId } = await parseParams(
    context.params,
    conversationParamsSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  const query = listMessagesQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const messages = await listMessagesForConversation(
    workspaceId,
    conversationId,
    userId,
    query,
  );

  return jsonSuccess(messages);
}