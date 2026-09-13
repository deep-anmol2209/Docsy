/**
 * Validation Stage
 *
 * Responsibility:
 * ----------------
 * Validate pipeline input before processing.
 *
 * SHOULD NOT:
 * -----------
 * - Parse document.
 * - Modify document.
 */

import { JobState } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';

export const ValidationStageName = 'ValidationStage';
export const ValidationStageState = JobState.VALIDATING;

export async function validationStage(context: PipelineContext): Promise<PipelineContext> {
  if (!context.sourceId) {
    throw new Error('[ValidationStage] Validation Failed: sourceId is missing in PipelineContext');
  }

  if (!context.jobId) {
    throw new Error('[ValidationStage] Validation Failed: jobId is missing in PipelineContext');
  }

  // Verify source input payload or source record presence
  if (!context.sourceInput && !context.sourceRecord) {
    throw new Error('[ValidationStage] Validation Failed: Source payload (sourceInput or sourceRecord) is missing');
  }

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [ValidationStageName]: Date.now(),
  };

  return {
    ...context,
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}
