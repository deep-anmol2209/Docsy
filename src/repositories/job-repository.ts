import { prisma } from "@/lib/db";
import { JobState } from "@/src/common-types/enums";
import {
  CreateJobInput,
  UpdateJobInput,
} from "@/src/validators/job-validator";

export async function createJob(input: CreateJobInput) {
  return prisma.job.create({
    data: input as any,
  });
}

export async function getJobById(jobId: string) {
  return prisma.job.findUnique({
    where: {
      id: jobId,
    },
    include: {
      stageHistory: true,
      source: true,
    },
  });
}

export async function getJobBySourceId(sourceId: string) {
  return prisma.job.findFirst({
    where: {
      sourceId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function listJobsByState(state: JobState) {
  return prisma.job.findMany({
    where: {
      state: state as any,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function updateJob(
  jobId: string,
  input: UpdateJobInput,
) {
  return prisma.job.update({
    where: {
      id: jobId,
    },
    data: input as any,
  });
}

export async function updateJobStage(
  jobId: string,
  state: JobState,
  currentStage: JobState,
) {
  return prisma.job.update({
    where: {
      id: jobId,
    },
    data: {
      state: state as any,
      currentStage: currentStage as any,
    },
  });
}

export async function markJobCompleted(
  jobId: string,
  metrics?: Record<string, unknown>,
) {
  return prisma.job.update({
    where: {
      id: jobId,
    },
    data: {
      state: JobState.COMPLETED as any,
      currentStage: JobState.COMPLETED as any,
      metrics: metrics as any,
    },
  });
}


export async function markJobFailed(
  jobId: string,
  failureReason: string,
) {
  return prisma.job.update({
    where: {
      id: jobId,
    },
    data: {
      state: JobState.FAILED as any,
      currentStage: JobState.FAILED as any,
      failureReason,
    },
  });
}

export async function deleteJob(jobId: string) {
  return prisma.job.delete({
    where: {
      id: jobId,
    },
  });
}

export const jobsRepository = {
  createJob,
  getJobById,
  getJobBySourceId,
  listJobsByState,
  updateJob,
  updateJobStage,
  markJobCompleted,
  markJobFailed,
  deleteJob,
};










