/**
 * Resolves Pinecone dense-search matches to real `Chunk` rows.
 *
 * Vectors are written with an id/metadata scheme that doesn't include the
 * real `Chunk.id` (see `vector-write.stage.ts`), but `documentId` + `order`
 * together uniquely identify the chunk within its document, so that pair
 * is used as the lookup key everywhere dense results need to be joined
 * back to Postgres (citations, lexical-fusion identity, full content).
 */

import { prisma } from "@/lib/db";
import type { Chunk } from "@/lib/generated/prisma/client";

export function chunkKey(documentId: string, order: number): string {
  return `${documentId}:${order}`;
}

export async function resolveChunksByDocumentOrder(
  keys: Array<{ documentId: string; order: number }>,
): Promise<Map<string, Chunk>> {
  if (keys.length === 0) {
    return new Map();
  }

  const rows = await prisma.chunk.findMany({ where: { OR: keys } });

  return new Map(rows.map((row) => [chunkKey(row.documentId, row.order), row]));
}