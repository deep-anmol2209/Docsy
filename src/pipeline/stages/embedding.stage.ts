/**
 * Embedding Stage
 *
 * Responsibility:
 * ----------------
 * Generate embeddings for every chunk.
 *
 * SHOULD NOT:
 * -----------
 * - Write to Vector DB.
 */

import { JobState } from '../../common-types/enums';
import type { Chunk } from '../../common-types/chunk-model';
import type { PipelineStage } from '../stage-interface';
import type { PipelineContext } from '../pipeline-context';

export const EmbeddingStageName = 'EmbeddingStage';
export const EmbeddingStageState = JobState.EMBEDDING;

export async function embeddingStage(context: PipelineContext): Promise<PipelineContext> {
  const chunks = context.chunks || [];

  if (chunks.length === 0) {
    return {
      ...context,
      embeddings: [],
    };
  }

  const model = 'nomic-embed-text';

  const embeddedChunks: Chunk[] = [];
  const generatedVectors: number[][] = [];

  for (const chunk of chunks) {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: chunk.content,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama embedding failed: ${response.status} ${await response.text()}`
      );
    }

    const data = await response.json();

    const vector: number[] = data.embeddings[0];

    generatedVectors.push(vector);

    embeddedChunks.push({
      ...chunk,
      embedding: {
        model,
        modelVersion: 'local',
        dimensions: vector.length,
        vector,
      },
    });
  }


  return {
    ...context,
    chunks: embeddedChunks,
    embeddings: generatedVectors,
    artifactLocations: {
      ...context.artifactLocations,
      embeddingArtifact: `/artifacts/${context.sourceId}/embeddings.json`,
    },
    processingMetadata: {
      ...context.processingMetadata,
      stageTimingsMs: {
        ...(context.processingMetadata?.stageTimingsMs ?? {}),
        [EmbeddingStageName]: Date.now(),
      },
    },
  };
}
