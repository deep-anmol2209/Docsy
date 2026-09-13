import { NextRequest } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { getAuthenticatedUserId } from "@/src/utils/auth";
import type { RouteContext } from "@/src/utils/route-context";
import { parseBody, parseParams } from "@/src/utils/request-parsers";
import {
  createWorkspaceForUser,
  deleteWorkspaceForUser,
  getWorkspaceByIdForUser,
  listWorkspacesByUser,
  updateWorkspaceForUser,
} from "@/src/services/workspace-service";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
} from "@/src/validators/workspace-validator";

export async function listWorkspaces(
  req: NextRequest,
  _context: RouteContext = {},
) {
  const userId = await getAuthenticatedUserId(req);
  const workspaces = await listWorkspacesByUser(userId);

  return jsonSuccess(workspaces);
}

export async function getWorkspace(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string }> = {},
) {
  const { workspaceId } = await parseParams(context.params, workspaceIdParamSchema);
  const userId = await getAuthenticatedUserId(req);
  const workspace = await getWorkspaceByIdForUser(workspaceId, userId);

  return jsonSuccess(workspace);
}

export async function createWorkspace(
  req: NextRequest,
  _context: RouteContext = {},
) {
  const input = await parseBody(req, createWorkspaceSchema);
  const userId = await getAuthenticatedUserId(req);
  const workspace = await createWorkspaceForUser(userId, input);

  return jsonSuccess(workspace, "Workspace created.", 201);
}

export async function updateWorkspace(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string }> = {},
) {
  const { workspaceId } = await parseParams(context.params, workspaceIdParamSchema);
  const input = await parseBody(req, updateWorkspaceSchema);
  const userId = await getAuthenticatedUserId(req);
  const workspace = await updateWorkspaceForUser(workspaceId, userId, input);

  return jsonSuccess(workspace, "Workspace updated.");
}

export async function deleteWorkspace(
  req: NextRequest,
  context: RouteContext<{ id: string }> = {},
) {
  const { workspaceId } = await parseParams(context.params, workspaceIdParamSchema);
  const userId = await getAuthenticatedUserId(req);

  await deleteWorkspaceForUser(workspaceId, userId);
  return new Response(null, { status: 204 });
}
