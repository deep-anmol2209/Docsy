/**
 * Pipeline Stage Contract
 *
 * Responsibility:
 * ----------------
 * Define a common contract for every pipeline stage.
 *
 * Every stage MUST:
 * -----------------
 * - Accept PipelineContext.
 * - Perform one responsibility.
 * - Return updated PipelineContext.
 *
 * SHOULD NOT:
 * -----------
 * - Execute another stage.
 * - Skip pipeline order.
 * - Directly manipulate pipeline flow.
 */

import { JobState } from '../common-types/enums';
import type { PipelineContext } from './pipeline-context';

export interface PipelineStage {
  readonly stageName: string;
  readonly stageState: JobState;
  execute(context: PipelineContext): Promise<PipelineContext>;
}