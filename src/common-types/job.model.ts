import { JobState } from './enums';

/**
 * job.model.ts
 *
 * Ingestion job lifecycle: the state machine shape, per-stage history for
 * observability, and enough failure detail to support targeted (per-stage) retry
 * rather than forcing a full re-ingestion whenever one stage fails.
 */

export interface JobError {
  readonly message: string;
  readonly stage: JobState;
  /** Whether re-running the failed stage is expected to be able to succeed (vs. a
   *  permanent failure such as an unsupported file that will never parse). */
  readonly isRetryable: boolean;
  /** ISO-8601 timestamp. */
  readonly occurredAt: string;
}

export interface JobStageHistoryEntry {
  readonly stage: JobState;
  /** ISO-8601 timestamp. */
  readonly enteredAt: string;
  /** ISO-8601 timestamp. Absent while the stage is still in progress. */
  readonly exitedAt?: string;
  readonly error?: JobError;
}

export interface Job {
  readonly id: string;
  readonly sourceId: string;

  readonly state: JobState;

  /** Full history of stage transitions this job has gone through, in order. Used both for
   *  the frontend's progress display and for resuming from the last successful checkpoint. */
  readonly stageHistory: readonly JobStageHistoryEntry[];

  readonly retryCount: number;
  readonly maxRetries: number;

  readonly lastError?: JobError;

  /** ISO-8601 timestamps. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Legal state transitions for the Job state machine, enforced by
 * `jobs/job.state-machine.ts`. Any state can transition to `FAILED`; the array below
 * only lists the additional, non-failure transitions available from each state.
 *
 * Note: `PARSING` can transition either to `OCR` (when the Analyzer, run just before,
 * flagged the document as requiring OCR) or directly to `NORMALIZING` - OCR is a
 * conditionally-invoked stage, not one every job passes through.
 */
export const JOB_STATE_TRANSITIONS: Readonly<Record<JobState, readonly JobState[]>> = {
  [JobState.QUEUED]: [JobState.VALIDATING, JobState.FAILED],
  [JobState.VALIDATING]: [JobState.PARSING, JobState.FAILED],
  [JobState.PARSING]: [JobState.OCR, JobState.NORMALIZING, JobState.FAILED],
  [JobState.OCR]: [JobState.NORMALIZING, JobState.FAILED],
  [JobState.NORMALIZING]: [JobState.ANALYZING, JobState.FAILED],
  [JobState.ANALYZING]: [JobState.CONVERTING_MARKDOWN, JobState.SELECTING_STRATEGY, JobState.FAILED],
  [JobState.CONVERTING_MARKDOWN]: [JobState.SELECTING_STRATEGY, JobState.FAILED],
  [JobState.SELECTING_STRATEGY]: [JobState.CHUNKING, JobState.FAILED],
  [JobState.CHUNKING]: [JobState.ENRICHING, JobState.FAILED],
  [JobState.ENRICHING]: [JobState.EMBEDDING, JobState.FAILED],
  [JobState.EMBEDDING]: [JobState.WRITING_TO_VECTOR_STORE, JobState.FAILED],
  [JobState.WRITING_TO_VECTOR_STORE]: [JobState.COMPLETED, JobState.FAILED],
  [JobState.COMPLETED]: [],
  [JobState.FAILED]: [],
};