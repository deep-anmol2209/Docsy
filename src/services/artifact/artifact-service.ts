/**
 * Artifact request/CRUD service (Phase 8/9).
 *
 * `requestArtifactGeneration` is the entry point from both the chat
 * pipeline (intent detection routed a message here instead of normal
 * chat) and the direct `POST /artifacts` endpoint: it only creates the
 * `GENERATING` row and enqueues the background job — all actual content
 * generation happens in `artifact-generate` (Inngest), never here.
 */

import type { ArtifactType, ArtifactStatus, Prisma } from "@/lib/generated/prisma/client";
import * as artifactRepository from "@/src/repositories/artifact-repository";
import { NotFoundError } from "@/src/errors/app-error";
import { inngest, ARTIFACT_GENERATE_EVENT } from "@/src/inngest/client";

function defaultTitleForType(type: ArtifactType, prompt: string): string {
  const label = type
    .toLowerCase()
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");

  const trimmedPrompt = prompt.trim();
  const snippet =
    trimmedPrompt.length > 60 ? `${trimmedPrompt.slice(0, 60)}…` : trimmedPrompt;

  return snippet ? `${label}: ${snippet}` : label;
}

export async function requestArtifactGeneration(params: {
  workspaceId: string;
  userId: string;
  type: ArtifactType;
  generationPrompt: string;
  title?: string;
  description?: string;
  /** Conversation this request originated from, if any — stored in `metadata` since `Artifact` has no direct conversation relation. */
  conversationId?: string;
}) {
  const title = params.title?.trim() || defaultTitleForType(params.type, params.generationPrompt);

  const metadata: Prisma.InputJsonValue | undefined = params.conversationId
    ? { conversationId: params.conversationId }
    : undefined;

  const artifact = await artifactRepository.createArtifact(
    params.workspaceId,
    params.userId,
    {
      title,
      description: params.description,
      type: params.type,
      generationPrompt: params.generationPrompt,
      metadata,
    },
  );

  if (!artifact) {
    throw new NotFoundError("Workspace not found.");
  }

  await inngest.send({
    name: ARTIFACT_GENERATE_EVENT,
    data: { artifactId: artifact.id },
  });

  return artifact;
}

export async function listArtifactsForWorkspace(
  workspaceId: string,
  userId: string,
  filters: { type?: ArtifactType; status?: ArtifactStatus },
) {
  return artifactRepository.listArtifactsForWorkspace(workspaceId, userId, filters);
}

export async function getArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  const artifact = await artifactRepository.getArtifactForWorkspace(
    workspaceId,
    artifactId,
    userId,
  );

  if (!artifact) {
    throw new NotFoundError("Artifact not found.");
  }

  return artifact;
}

export async function updateArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
  input: { title?: string; description?: string; isPinned?: boolean; isDeleted?: boolean },
) {
  const artifact = await artifactRepository.updateArtifactForWorkspace(
    workspaceId,
    artifactId,
    userId,
    input,
  );

  if (!artifact) {
    throw new NotFoundError("Artifact not found.");
  }

  return artifact;
}

/** Soft delete — sets `isDeleted`, matching the schema's existing field rather than hard-deleting. */
export async function deleteArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  await updateArtifactForWorkspace(workspaceId, artifactId, userId, { isDeleted: true });
}