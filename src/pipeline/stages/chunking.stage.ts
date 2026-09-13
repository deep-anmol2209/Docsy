import { ChunkStrategyName, JobState } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { selectStrategy } from '../../chunking/chunk-strategy-selector';
import { postprocess } from '../../chunking/chunk-postprocessor';

/**
 * chunking.stage.ts
 *
 * Pipeline Stage: Chunking
 * ------------------------
 * Splits the parsed document into retrievable chunks by delegating entirely to
 * whichever `IChunkStrategy` the earlier Strategy Selection stage chose. This stage
 * owns none of the splitting logic itself:
 *
 * 1. Resolve the strategy for `context.selectedStrategy` via the Chunk Strategy Selector.
 * 2. Run it against the parsed document.
 * 3. Run the shared post-processing pass (min-length filter + dedup) over the result.
 *
 * SHOULD NOT:
 * -----------
 * - Contain any format-specific or strategy-specific splitting logic.
 * - Decide which strategy to use - that decision belongs entirely to the earlier
 *   Strategy Selection stage; this stage only executes whatever it chose.
 */
export const ChunkingStageName = 'ChunkingStage';
export const ChunkingStageState = JobState.CHUNKING;

export async function chunkingStage(context: PipelineContext): Promise<PipelineContext> {
  if (!context.rawDocument) {
    throw new Error('ChunkingStage requires a parsed document (context.rawDocument) to run.');
  }

  const strategyName = context.selectedStrategy ?? ChunkStrategyName.PARAGRAPH;
  const strategy = selectStrategy(strategyName);

  const rawChunks = await strategy.chunk(context.rawDocument, context.markdownContent);
  const draftChunks = postprocess(rawChunks);

  return {
    ...context,
    draftChunks,
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: {
        ...(context.processingMetadata?.stageTimingsMs ?? {}),
        [ChunkingStageName]: Date.now(),
      },
    },
  };
}
