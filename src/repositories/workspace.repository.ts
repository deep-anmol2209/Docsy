// import { AppError } from "@/src/errors/app-error";
// import {
//   CreateWorkspaceInput,
//   UpdateWorkspaceInput,
// } from "@/src/validators/workspace-validator";

// export async function listWorkspacesByUser(userId: string) {
//   throw new AppError(
//     501,
//     "Workspace repository is not implemented. Add a Workspace Prisma model and repository queries.",
//   );
// }

// export async function getWorkspaceByIdForUser(
//   workspaceId: string,
//   userId: string,
// ) {
//   throw new AppError(
//     501,
//     "Workspace repository is not implemented. Add a Workspace Prisma model and repository queries.",
//   );
// }

// export async function createWorkspaceForUser(
//   userId: string,
//   input: CreateWorkspaceInput,
// ) {
//   throw new AppError(
//     501,
//     "Workspace repository is not implemented. Add a Workspace Prisma model and repository queries.",
//   );
// }

// export async function updateWorkspaceForUser(
//   workspaceId: string,
//   userId: string,
//   input: UpdateWorkspaceInput,
// ) {
//   throw new AppError(
//     501,
//     "Workspace repository is not implemented. Add a Workspace Prisma model and repository queries.",
//   );
// }

// export async function deleteWorkspaceForUser(workspaceId: string, userId: string) {
//   throw new AppError(
//     501,
//     "Workspace repository is not implemented. Add a Workspace Prisma model and repository queries.",
//   );
// }


import { prisma } from "@/lib/db";
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/src/validators/workspace-validator";

export async function listWorkspacesByUser(userId: string) {
  return prisma.workspace.findMany({
    where: {
      userId,
    },
       include: {
      _count: {
        select: {
          sources: true,
         artifacts: {
  where: {
    isDeleted: false,
  },
},
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getWorkspaceByIdForUser(
  workspaceId: string,
  userId: string,
) {
  return prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      userId,
    },
    include: {
      _count: {
        select: {
          sources: true,
          artifacts: {
            where: {
              isDeleted: false,
            }
          },
        },
      },
    },
  });
}

export async function createWorkspaceForUser(
  userId: string,
  input: CreateWorkspaceInput,
) {
  return prisma.workspace.create({
    data: {
      ...input,
      userId,
    },
  });
}

export async function updateWorkspaceForUser(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
) {
  return prisma.workspace.updateMany({
    where: {
      id: workspaceId,
      userId,
    },
    data: input,
  });
}

export async function deleteWorkspaceForUser(
  workspaceId: string,
  userId: string,
) {
  return prisma.workspace.deleteMany({
    where: {
      id: workspaceId,
      userId,
    },
  });
}