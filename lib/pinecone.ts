/**
 * Pinecone client singleton.
 *
 * Used by both the ingestion pipeline's `VectorWriteStage` (writes) and
 * the chat retrieval service (queries). Reuses one client across
 * invocations/hot-reloads, same pattern as `lib/db.ts`.
 *
 * Requires `PINECONE_API_KEY`. If it's not set, `getPineconeClient()`
 * returns `null` so callers can degrade gracefully (ingestion already
 * does this; retrieval should treat a `null` client as "no vector search
 * available" rather than throwing).
 */

import { Pinecone } from "@pinecone-database/pinecone";

const globalForPinecone = globalThis as unknown as {
  pinecone: Pinecone | undefined;
};

/** Index used for chunk vectors. Override with `PINECONE_INDEX`. */
export const defaultIndexName = process.env.PINECONE_INDEX ?? "mylm";

export function getPineconeClient(): Pinecone | null {
  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!globalForPinecone.pinecone) {
    globalForPinecone.pinecone = new Pinecone({ apiKey });
  }

  return globalForPinecone.pinecone;
}