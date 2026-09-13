import { JobState } from '@/src/common-types/enums';

export interface JobCheckpoints {
  readonly parserCompleted?: boolean;
  readonly normalizationCompleted?: boolean;
  readonly analysisCompleted?: boolean;
  readonly chunkCompleted?: boolean;
  readonly embeddingCompleted?: boolean;
  readonly vectorCompleted?: boolean;
}


/**
 * Job Collection Schema
 *
 * Responsibility:
 * - Track ingestion pipeline execution.
 * - Support retry and crash recovery.
 * - Progress reporting and checkpoints.
 */
export interface JobRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly state: JobState;
  readonly currentStage: JobState;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly failureReason?: string;
  readonly workerId?: string;
  readonly checkpoints: JobCheckpoints;

  readonly createdAt: string;
  readonly updatedAt: string;
}
export type CreateJobInput = Omit<
  JobRecord,
  "id" | "createdAt" | "updatedAt"
>;
export function createJobRecord(
  sourceId: string,
  id = `job-${Date.now()}`
): JobRecord {
  const now = new Date().toISOString();
  return {
    id,
    sourceId,
    state: JobState.QUEUED,
    currentStage: JobState.QUEUED,
    retryCount: 0,
    maxRetries: 3,
    checkpoints: {},
    createdAt: now,
    updatedAt: now,
  };
}