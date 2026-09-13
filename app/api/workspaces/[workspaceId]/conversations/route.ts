import {
  listConversations,
  createConversation,
} from "@/src/controllers/conversation";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(listConversations);

export const POST = withErrorHandler(createConversation);