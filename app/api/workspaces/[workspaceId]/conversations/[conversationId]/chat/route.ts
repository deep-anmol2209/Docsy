import { sendMessage } from "@/src/controllers/chat";

import { withErrorHandler } from "@/src/utils/error-handler";

export const POST = withErrorHandler(sendMessage);