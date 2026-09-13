import {
  getConversation,
  updateConversation,
  deleteConversation,
} from "@/src/controllers/conversation";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(getConversation);

export const PATCH = withErrorHandler(updateConversation);

export const DELETE = withErrorHandler(deleteConversation);