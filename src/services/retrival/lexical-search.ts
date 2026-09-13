/**
 * Lexical search over chunk content using Postgres full-text search
 * (`ts_rank_cd` over `to_tsvector('english', content)`), as the "BM25 /
 * lexical" leg of hybrid retrieval.
 *
 * This is a reasonable proxy for BM25, not a literal implementation, and
 * runs `to_tsvector` on the fly rather than against a stored/indexed
 * column — fine at moderate chunk counts. If this becomes a bottleneck,
 * add a persisted `tsv tsvector` generated column + GIN index on `Chunk`
 * and query that column directly instead.
 */

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export type LexicalMatch = {
  chunkId: string;
  score: number;
};

export async function lexicalSearch(params: {
  text: string;
  sourceIds: string[];
  topK: number;
}): Promise<LexicalMatch[]> {
  if (params.sourceIds.length === 0 || !params.text.trim()) {
    return [];
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; score: number }>>(
    Prisma.sql`
      SELECT "id",
             ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', ${params.text})) AS score
      FROM "Chunk"
      WHERE "sourceId" IN (${Prisma.join(params.sourceIds)})
        AND to_tsvector('english', "content") @@ plainto_tsquery('english', ${params.text})
      ORDER BY score DESC
      LIMIT ${params.topK}
    `,
  );

  return rows.map((row) => ({ chunkId: row.id, score: row.score }));
}