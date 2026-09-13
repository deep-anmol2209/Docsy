import { prisma } from "@/lib/db";
import type { ArtifactType, ArtifactStatus, Prisma } from "@/lib/generated/prisma/client";

/**
 * Artifact persistence. Every query is scoped to `workspaceId` AND joined
 * through `workspace.userId`, same ownership pattern as the conversation
 * repository. Soft-deleted artifacts (`isDeleted`) are excluded from
 * listing by default but remain readable/restorable via `getArtifactForWorkspace`.
 */

export async function listArtifactsForWorkspace(
  workspaceId: string,
  userId: string,
  filters: { type?: ArtifactType; status?: ArtifactStatus } = {},
) {
  return prisma.artifact.findMany({
    where: {
      workspaceId,
      workspace: { userId },
      isDeleted: false,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
) {
  return prisma.artifact.findFirst({
    where: {
      id: artifactId,
      workspaceId,
      workspace: { userId },
    },
    include: { sources: { include: { source: { select: { id: true, title: true } } } } },
  });
}

export async function createArtifact(
  workspaceId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    type: ArtifactType;
    generationPrompt: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });

  if (!workspace) {
    return null;
  }

  return prisma.artifact.create({
    data: {
      workspaceId,
      title: input.title,
      description: input.description,
      type: input.type,
      generationPrompt: input.generationPrompt,
      metadata: input.metadata,
      status: "GENERATING",
    },
  });
}

export async function updateArtifactForWorkspace(
  workspaceId: string,
  artifactId: string,
  userId: string,
  input: {
    title?: string;
    description?: string;
    isPinned?: boolean;
    isDeleted?: boolean;
  },
) {
  const existing = await getArtifactForWorkspace(workspaceId, artifactId, userId);

  if (!existing) {
    return null;
  }

  return prisma.artifact.update({
    where: { id: artifactId },
    data: input,
  });
}

/** Unscoped by design — called only from the trusted Inngest background job, never from a request handler. */
export async function getArtifactById(artifactId: string) {
  return prisma.artifact.findUnique({ where: { id: artifactId } });
}

/** Unscoped by design — same caller as {@link getArtifactById}. */
export async function markArtifactReady(
  artifactId: string,
  data: {
    content: string;
    modelUsed: string;
    modelVersion?: string;
    tokenUsage?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.artifact.update({
    where: { id: artifactId },
    data: {
      status: "READY",
      content: data.content,
      modelUsed: data.modelUsed,
      modelVersion: data.modelVersion,
      tokenUsage: data.tokenUsage,
      metadata: data.metadata,
    },
  });
}

/** Unscoped by design — same caller as {@link getArtifactById}. */
export async function markArtifactFailed(
  artifactId: string,
  failureMetadata: Prisma.InputJsonValue,
) {
  return prisma.artifact.update({
    where: { id: artifactId },
    data: {
      status: "FAILED",
      metadata: failureMetadata,
    },
  });
}

/** Links an artifact to the sources it was generated from. Idempotent — safe to call again on retry. */
export async function linkArtifactSources(artifactId: string, sourceIds: string[]) {
  if (sourceIds.length === 0) return;

  await prisma.artifactSource.createMany({
    data: Array.from(new Set(sourceIds)).map((sourceId) => ({ artifactId, sourceId })),
    skipDuplicates: true,
  });
}