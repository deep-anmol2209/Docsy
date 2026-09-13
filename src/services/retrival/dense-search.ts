/**
 * Dense vector search — thin wrapper around Pinecone, scoped to a fixed
 * set of source ids. Used once per query variant by the hybrid retrieval
 * pipeline; results are merged across variants via RRF.
 */

import { getPineconeClient, defaultIndexName } from "@/lib/pinecone";
import { embedQuery } from "@/src/services/retrival/query-embedder";
import { logger } from "@/src/utils/logger";

export type DenseMatch = {
  /** Pinecone's own vector id — not a real `Chunk.id`, see `retrieval-service.ts`. */
  vectorId: string;
  documentId?: string;
  order?: number;
  score: number;
};

export async function denseSearch(params: {
  text: string;
  sourceIds: string[];
  topK: number;
}): Promise<DenseMatch[]> {
  const pinecone = getPineconeClient();

  if (!pinecone) {
    logger.warn("Pinecone is not configured; dense search returning no results.");
    return [];
  }

  if (params.sourceIds.length === 0) {
    return [];
  }

  const vector = await embedQuery(params.text);
  const index = pinecone.index(defaultIndexName);

  const result = await index.query({
    vector,
    topK: params.topK,
    includeMetadata: true,
    filter: { sourceId: { $in: params.sourceIds } },
  });

  return (result.matches ?? []).map((match) => ({
    vectorId: match.id,
    documentId: match.metadata?.documentId as string | undefined,
    order: match.metadata?.order as number | undefined,
    score: match.score ?? 0,
  }));
}