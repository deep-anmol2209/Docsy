import { prisma } from "@/lib/db";
import { SourceType, JobState } from "@/src/common-types/enums";
import type {
  CreateSourceDbInput,
  UpdateSourceDbInput
} from "@/src/validators/source-validator";

function mapToPrismaSourceType(sourceType?: string): "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN" {
  if (!sourceType) return "TEXT";
  const upper = sourceType.toUpperCase();
  if (upper === "PDF") return "PDF";
  if (upper === "YOUTUBE") return "YOUTUBE";
  if (upper === "WEBPAGE" || upper === "WEBSITE") return "WEBSITE";
  if (upper === "MARKDOWN") return "MARKDOWN";
  return "TEXT";
}

export async function createSource(input: any) {
  console.log("creating source in repo");
  console.log("workspace id is ", input.workspaceId);
  
  if (!input.workspaceId) {
    throw new Error("createSource requires a workspaceId — no default is used.");
  }

  const type = mapToPrismaSourceType(input.type || input.sourceType);

  return prisma.source.create({
    data: {
      id: input.id,
      workspaceId: input.workspaceId,
      type: type,
      title: input.title || "Untitled",
      content: input.content || input.text,
      url: input.url,
      originalReference: input.originalReference || input.url || input.fileName,
      storageLocation: input.storageLocation,
      cloudinaryPublicId: input.cloudinaryPublicId || input.publicId,
      cloudinarySecureUrl: input.cloudinarySecureUrl || input.storageLocation,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      ingestionStatus: (input.ingestionStatus as any) || JobState.QUEUED,
      uploadMetadata: input.uploadMetadata as any,
      metadata: input.metadata as any,
    },
  });
}


export async function getSourceById(sourceId: string) {
  return prisma.source.findUnique({
    where: {
      id: sourceId,
    },
  });
}

export async function listSourcesByWorkspace(workspaceId: string) {
  return prisma.source.findMany({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getAllSources(userId?: string, workspaceId?: string) {
  return prisma.source.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// --- Workspace/user-scoped functions (used by the current API) ---
//
// The functions above (`getAllSources`, `updateSource`, `deleteSource`)
// predate the workspace/auth model and have no ownership scoping — kept
// only because `src/actions/source.ts`'s low-level `createSource` still
// uses this file. Everything reachable from `src/controllers/source.ts`
// goes through the functions below instead, which join through
// `workspace.userId` the same way conversation/artifact repositories do.

export async function listSourcesForWorkspace(workspaceId: string, userId: string) {
  return prisma.source.findMany({
    where: { workspaceId, workspace: { userId } },
    orderBy: { createdAt: "desc" },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function getSourceForWorkspace(
  workspaceId: string,
  sourceId: string,
  userId: string,
) {
  return prisma.source.findFirst({
    where: { id: sourceId, workspaceId, workspace: { userId } },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function deleteSourceForWorkspace(
  workspaceId: string,
  sourceId: string,
  userId: string,
) {
  const existing = await prisma.source.findFirst({
    where: { id: sourceId, workspaceId, workspace: { userId } },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.source.delete({ where: { id: sourceId } });
  return true;
}

/** Verifies ownership, then resets the source + its most recent job back to `QUEUED` for a retry. Returns `null` if not found/owned. */
export async function resetSourceForRetry(
  workspaceId: string,
  sourceId: string,
  userId: string,
) {
  const existing = await prisma.source.findFirst({
    where: {
      id: sourceId,
      workspaceId,
      workspace: {
        userId,
      },
    },
    include: {
      jobs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      documents: {
        take: 1,
      },
    },
  });

  if (!existing) {
    return null;
  }

  const source = await prisma.source.update({
    where: {
      id: sourceId,
    },
    data: {
      ingestionStatus: JobState.QUEUED as any,
    },
  });

  const latestJob = existing.jobs[0];

  const job = latestJob
    ? await prisma.job.update({
        where: {
          id: latestJob.id,
        },
        data: {
          state: JobState.QUEUED as any,
          currentStage: JobState.QUEUED as any,
          failureReason: null,
          retryCount: {
            increment: 1,
          },
        },
      })
    : null;

  const document = existing.documents[0] ?? null;

  return {
    source,
    job,
    document,
  };
}

export async function updateSource(
  sourceId: string,
  input: UpdateSourceDbInput,
) {
  return prisma.source.update({
    where: {
      id: sourceId,
    },
    data: input as any,
  });
}

// export async function deleteSource(sourceId: string) {
//   return prisma.source.delete({
//     where: {
//       id: sourceId,
//     },
//   });
// }

export const sourcesRepository = {
  createSource,
  getSourceById,
  listSourcesByWorkspace,
  getAllSources,
  updateSource,
  deleteSourceForWorkspace,
  resetSourceForRetry,
};