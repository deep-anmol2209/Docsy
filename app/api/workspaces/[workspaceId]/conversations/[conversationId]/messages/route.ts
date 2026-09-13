import { listMessages } from "@/src/controllers/message";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(listMessages);