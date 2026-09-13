import { NextRequest } from "next/server";
import { jsonSuccess } from "@/src/utils/api-response";
import { getAuthenticatedUserId } from "@/src/utils/auth";
import type { RouteContext } from "@/src/utils/route-context";
import { parseBody, parseParams } from "@/src/utils/request-parsers";
import { workspaceIdParamSchema } from "@/src/validators/workspace-validator";
import {
  artifactParamsSchema,
  createArtifactSchema,
  listArtifactsQuerySchema,
  updateArtifactSchema,
} from "@/src/validators/artifact-validator";
import {
  requestArtifactGeneration,
  listArtifactsForWorkspace,
  getArtifactForWorkspace,
  updateArtifactForWorkspace,
  deleteArtifactForWorkspace,
} from "@/src/services/artifact/artifact-service";
import type { ArtifactType, ArtifactStatus } from "@/lib/generated/prisma/client";
import { ARTIFACT_RATE_LIMIT } from "@/lib/ai-config";
import { checkRateLimit } from "@/src/utils/rate-limiter";
import { createMessage } from "../repositories/message-repository";
export async function listArtifacts(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string }> = {},
) {
  const { workspaceId } = await parseParams(context.params, workspaceIdParamSchema);
  const userId = await getAuthenticatedUserId(req);

  const query = listArtifactsQuerySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const artifacts = await listArtifactsForWorkspace(workspaceId, userId, {
    type: query.type as ArtifactType | undefined,
    status: query.status as ArtifactStatus | undefined,
  });

  return jsonSuccess(artifacts);
}

/** Direct artifact creation, outside the chat flow — the type is given explicitly rather than inferred from a chat message. */
export async function createArtifact(
  req: NextRequest,
  context: RouteContext<{ workspaceId: string }> = {},
) {
  const { workspaceId } = await parseParams(context.params, workspaceIdParamSchema);
  const input = await parseBody(req, createArtifactSchema);
  const userId = await getAuthenticatedUserId(req);

  checkRateLimit(`artifact:${userId}`, ARTIFACT_RATE_LIMIT);

  const artifact = await requestArtifactGeneration({
    workspaceId,
    userId,
    type: input.type as ArtifactType,
    generationPrompt: input.generationPrompt,
    title: input.title,
    description: input.description,
  });

  return jsonSuccess(artifact, "Artifact generation started.", 202);
}

export async function getArtifact(
  req: NextRequest,
  context: RouteContext<{ id: string; artifactId: string }> = {},
) {
  const { workspaceId: workspaceId, artifactId } = await parseParams(
    context.params,
    artifactParamsSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  const artifact = await getArtifactForWorkspace(workspaceId, artifactId, userId);

  return jsonSuccess(artifact);
}

export async function updateArtifact(
  req: NextRequest,
  context: RouteContext<{ id: string; artifactId: string }> = {},
) {
  const {workspaceId: workspaceId, artifactId } = await parseParams(
    context.params,
    artifactParamsSchema,
  );
  const input = await parseBody(req, updateArtifactSchema);
  const userId = await getAuthenticatedUserId(req);

  const artifact = await updateArtifactForWorkspace(workspaceId, artifactId, userId, input);

  return jsonSuccess(artifact, "Artifact updated.");
}

export async function deleteArtifact(
  req: NextRequest,
  context: RouteContext<{ id: string; artifactId: string }> = {},
) {
  const { workspaceId: workspaceId, artifactId } = await parseParams(
    context.params,
    artifactParamsSchema,
  );
  const userId = await getAuthenticatedUserId(req);

  await deleteArtifactForWorkspace(workspaceId, artifactId, userId);

  return new Response(null, { status: 204 });
}