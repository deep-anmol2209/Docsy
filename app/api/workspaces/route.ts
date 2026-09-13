import {
  listWorkspaces,
  createWorkspace,
} from "@/src/controllers/workspace";

import { withErrorHandler } from "@/src/utils/error-handler";

export const GET = withErrorHandler(listWorkspaces);

export const POST = withErrorHandler(createWorkspace);