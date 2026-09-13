import * as workspaceRepository from "@/src/repositories/workspace.repository";
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/src/validators/workspace-validator";
import { NotFoundError } from "@/src/errors/app-error";

export async function listWorkspacesByUser(userId: string) {
  return await workspaceRepository.listWorkspacesByUser(userId);
}

export async function getWorkspaceByIdForUser(
  workspaceId: string,
  userId: string,
) {
  const workspace = await workspaceRepository.getWorkspaceByIdForUser(
    workspaceId,
    userId,
  );


  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  return workspace;
}

export async function createWorkspaceForUser(
  userId: string,
  input: CreateWorkspaceInput,
) {
  return await workspaceRepository.createWorkspaceForUser(userId, input);
}

export async function updateWorkspaceForUser(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
) {
  const workspace = await workspaceRepository.updateWorkspaceForUser(
    workspaceId,
    userId,
    input,
  );

  if (!workspace) {
    throw new NotFoundError("Workspace not found.");
  }

  return workspace;
}

export async function deleteWorkspaceForUser(
  workspaceId: string,
  userId: string,
) {
  const deleted = await workspaceRepository.deleteWorkspaceForUser(
    workspaceId,
    userId,
  );

  if (!deleted) {
    throw new NotFoundError("Workspace not found.");
  }
}