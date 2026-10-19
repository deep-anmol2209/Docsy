
import { prisma } from "@/lib/db";
import type { Chunk } from "@/lib/generated/prisma/client";
import { JobState } from "@/lib/generated/prisma/enums";
import {
  RAG_TOP_K,
  DENSE_CANDIDATE_POOL,
  LEXICAL_CANDIDATE_POOL,
  RERANK_CANDIDATE_POOL,
  HYBRID_RETRIEVAL_ENABLED,
  RERANK_ENABLED,
  RERANK_RELEVANCE_THRESHOLD,
} from "@/lib/ai-config";
import { denseSearch } from "@/src/services/retrival/dense-search";
import { lexicalSearch } from "@/src/services/retrival/lexical-search";
import { reciprocalRankFusion } from "@/src/services/retrival/rrf";
import { rerankCandidates, type RankedCandidate } from "@/src/services/retrival/reranker";
import {
  resolveTranscriptLineTimestamp,
  type TranscriptLine,
} from "@/src/services/retrival/transcript-line-resolver";
import {
  chunkKey,
  resolveChunksByDocumentOrder,
} from "@/src/services/retrival/chunk-resolver";
import { buildQueryVariants } from "@/src/services/chat/query-transformer";
import { logger } from "@/src/utils/logger";

export type RetrievedChunk = {
  sourceId: string;
  chunkId: string;
  sourceTitle: string;
  content: string;
  /** Fused (RRF) relevance score — not a cosine similarity or probability, only meaningful for relative ordering. */
  score: number;
  /** Reranker relevance score (0-10 scale), preserved separately from RRF score. */
  relevanceScore?: number;
  transcriptLine?: TranscriptLine | null;
  page?: number | null;
  heading?: string | null;
  section?: string | null;
  slideNumber?: number | null;
  startTimeSeconds?: number | null;
  endTimeSeconds?: number | null;
};

export async function retrieveChunksForWorkspace(
  workspaceId: string,
  query: string,
  topK: number = RAG_TOP_K,
  sourceFilterIds?: string[],
): Promise<RetrievedChunk[]> {
  const readySources = await prisma.source.findMany({
    where: {
      workspaceId,
      ingestionStatus: JobState.COMPLETED,
      ...(sourceFilterIds ? { id: { in: sourceFilterIds } } : {}),
    },
    select: { id: true, title: true },
  });

  if (readySources.length === 0) {
    console.log("retrieved candidates: 0");
    logger.info("retrieved candidates: 0");
    console.log("relevant candidates: 0");
    logger.info("relevant candidates: 0");
    console.log("final returned chunks: 0");
    logger.info("final returned chunks: 0");
    return [];
  }

  const sourceTitleById = new Map(readySources.map((s) => [s.id, s.title]));
  const sourceIds = readySources.map((s) => s.id);

  const variants = await buildQueryVariants(query);
  const denseQueryTexts = Array.from(
    new Set(
      [variants.original, variants.rewritten, variants.hyde, variants.stepBack].filter(
        (v): v is string => !!v,
      ),
    ),
  );
console.log("variants: ", variants);
  const denseResultsPerVariant = await Promise.all(
    denseQueryTexts.map((text) =>
      denseSearch({ text, sourceIds, topK: DENSE_CANDIDATE_POOL }),
    ),
  );

  const lookupKeys = denseResultsPerVariant
    .flat()
    .filter(
      (m): m is typeof m & { documentId: string; order: number } =>
        m.documentId !== undefined && m.order !== undefined,
    )
    .map((m) => ({ documentId: m.documentId, order: m.order }));

  const chunkByDocOrder = await resolveChunksByDocumentOrder(lookupKeys);

  const denseRankedLists = denseResultsPerVariant.map((matches) =>
    matches
      .map((m) =>
        m.documentId !== undefined && m.order !== undefined
          ? chunkByDocOrder.get(chunkKey(m.documentId, m.order))
          : undefined,
      )
      .filter((c): c is Chunk => !!c)
      .map((c) => ({ id: c.id })),
  );

  const lexicalMatches = HYBRID_RETRIEVAL_ENABLED
    ? await lexicalSearch({
        text: variants.original,
        sourceIds,
        topK: LEXICAL_CANDIDATE_POOL,
      })
    : [];
  const lexicalRankedList = lexicalMatches.map((m) => ({ id: m.chunkId }));

  const fused = reciprocalRankFusion(
    HYBRID_RETRIEVAL_ENABLED
      ? [...denseRankedLists, lexicalRankedList]
      : denseRankedLists,
  ).slice(0, RERANK_CANDIDATE_POOL);
console.log("fused: ", fused.map(f=> ({id: f.id, score: f.score})));
  if (fused.length === 0) {
    console.log("retrieved candidates: 0");
    logger.info("retrieved candidates: 0");
    console.log("relevant candidates: 0");
    logger.info("relevant candidates: 0");
    console.log("final returned chunks: 0");
    logger.info("final returned chunks: 0");
    return [];
  }

  const knownChunks = new Map(
    Array.from(chunkByDocOrder.values()).map((c) => [c.id, c] as const),
  );
  const missingIds = fused
    .map((f) => f.id)
    .filter((id) => !knownChunks.has(id));

  if (missingIds.length > 0) {
    const missingRows = await prisma.chunk.findMany({
      where: { id: { in: missingIds } },
    });
    for (const row of missingRows) {
      knownChunks.set(row.id, row);
    }
  }

  const orderedCandidates = fused
    .map((f) => knownChunks.get(f.id))
    .filter((c): c is Chunk => !!c);

  console.log(`retrieved candidates: ${orderedCandidates.length}`);
  logger.info(`retrieved candidates: ${orderedCandidates.length}`);

  if (orderedCandidates.length === 0) {
    console.log("relevant candidates: 0");
    logger.info("relevant candidates: 0");
    console.log("final returned chunks: 0");
    logger.info("final returned chunks: 0");
    return [];
  }

  const rankedCandidates: RankedCandidate[] = RERANK_ENABLED
    ? await rerankCandidates(
        variants.original,
        orderedCandidates.map((c) => ({ id: c.id, content: c.content })),
        RERANK_RELEVANCE_THRESHOLD,
      )
    : orderedCandidates.map((c) => ({ id: c.id, score: 10 }));

  console.log(`relevant candidates: ${rankedCandidates.length}`);
  logger.info(`relevant candidates: ${rankedCandidates.length}`);

  if (rankedCandidates.length === 0) {
    console.log("final returned chunks: 0");
    logger.info("final returned chunks: 0");
    return [];
  }

  const rrfScoreById = new Map(fused.map((f) => [f.id, f.score]));
  const relevanceScoreById = new Map(rankedCandidates.map((r) => [r.id, r.score]));

  const topChunks = rankedCandidates
    .slice(0, topK)
    .map((r) => knownChunks.get(r.id))
    .filter((c): c is Chunk => !!c);

  const retrieved: RetrievedChunk[] = topChunks.map((chunk) => ({
    sourceId: chunk.sourceId,
    chunkId: chunk.id,
    sourceTitle: sourceTitleById.get(chunk.sourceId) ?? "Untitled source",
    content: chunk.content,
    score: rrfScoreById.get(chunk.id) ?? 0,
    relevanceScore: relevanceScoreById.get(chunk.id),
    page: chunk.page,
    heading: chunk.heading,
    section: chunk.section,
    slideNumber: chunk.slideNumber,
    startTimeSeconds: chunk.startTimeSeconds,
    endTimeSeconds: chunk.endTimeSeconds,
  }));

  console.log(`final returned chunks: ${retrieved.length}`);
  logger.info(`final returned chunks: ${retrieved.length}`);

  // Second stage: within each winning TRANSCRIPT chunk, resolve the query
  // to the single best-matching line and use *its* timestamp instead of
  // the chunk's overall (first-line) span — only runs on the final top-K
  // chunks that already won semantic search, not the whole candidate pool.
  await Promise.all(
    topChunks.map(async (chunk, index) => {
      const lines = chunk.transcriptLines as unknown as TranscriptLine[] | null;

      if (chunk.strategy !== "transcript" || !lines || lines.length === 0) {
        return;
      }

      const resolved = await resolveTranscriptLineTimestamp(variants.original, lines);

      if (resolved) {
        retrieved[index].startTimeSeconds = resolved.startTimeSeconds;
        retrieved[index].endTimeSeconds = resolved.endTimeSeconds;
      }
    }),
  );

  return retrieved;
}