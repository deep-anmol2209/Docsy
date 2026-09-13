/**
 * Vector Write Stage
 *
 * Responsibility:
 * ----------------
 * Persist embeddings and chunk metadata into Pinecone Vector Database.
 *
 * SHOULD NOT:
 * -----------
 * - Generate embeddings.
 * - Modify chunk content.
 */

import { JobState } from '../../common-types/enums';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';
import { getPineconeClient, defaultIndexName } from '../../../lib/pinecone';

export const VectorWriteStageName = 'VectorWriteStage';
export const VectorWriteStageState = JobState.WRITING_TO_VECTOR_STORE;

export async function vectorWriteStage(context: PipelineContext): Promise<PipelineContext> {
  const chunks = context.chunks || [];
  let insertedCount = 0;
  const indexName = defaultIndexName;

  const pinecone = getPineconeClient();

  if (pinecone && chunks.length > 0) {
    try {
      const index = pinecone.index(indexName);

      const records = chunks
        .map((chunk, idx) => {
          const vector = chunk.embedding?.vector || [];
          if (!vector || vector.length === 0) return null;

          return {
            id: `${context.sourceId}-chunk-${idx}`,
            values: Array.from(vector),
            metadata: {
              sourceId: context.sourceId,
              documentId: chunk.documentId,
              content: chunk.content,
              order: chunk.order,
              page: chunk.position?.page ?? 1,
              strategy: String(chunk.strategy),
              tokenCount: chunk.tokenCount ?? 0,
              ...(chunk.position?.heading ? { heading: chunk.position.heading } : {}),
              ...(chunk.position?.section ? { section: chunk.position.section } : {}),
              ...(chunk.position?.startTimeSeconds !== undefined ? { startTimeSeconds: chunk.position.startTimeSeconds } : {}),
              ...(chunk.position?.endTimeSeconds !== undefined ? { endTimeSeconds: chunk.position.endTimeSeconds } : {}),
              ...(chunk.position?.slideNumber !== undefined ? { slideNumber: chunk.position.slideNumber } : {}),
            },
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (records.length > 0) {
        await index.upsert({ records });
        insertedCount = records.length;
        console.log(`[VECTOR WRITE STAGE] 🌲 Successfully stored ${insertedCount} vectors in Pinecone index '${indexName}'`);
      }
    } catch (err) {
      console.error(`[VECTOR WRITE STAGE] ⚠️ Error storing vectors in Pinecone index '${indexName}':`, err);
    }
  } else {
    insertedCount = chunks.length;
  }

  const vectorStoreResult = {
    insertedCount,
    collectionName: indexName,
    writtenAt: new Date().toISOString(),
  };

  const stageTimings = {
    ...(context.processingMetadata?.stageTimingsMs ?? {}),
    [VectorWriteStageName]: Date.now(),
  };

  return {
    ...context,
    vectorStoreResult,
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: stageTimings,
    },
  };
}
