import {
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "@/src/controllers/workspace";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(getWorkspace);

export const PATCH = withErrorHandler(updateWorkspace);

export const DELETE = withErrorHandler(deleteWorkspace);