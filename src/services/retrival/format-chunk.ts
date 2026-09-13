/**
 * Renders a retrieved chunk as a numbered, citable block for LLM prompts.
 * Shared by chat's context builder and artifact generation so citation
 * formatting stays consistent between the two.
 */

import type { RetrievedChunk } from "@/src/services/retrival/retrival-service";

export function formatRetrievedChunk(chunk: RetrievedChunk, index: number): string {
  const location = [
    chunk.page ? `page ${chunk.page}` : null,
    chunk.heading ?? null,
    chunk.section ?? null,
    chunk.slideNumber ? `slide ${chunk.slideNumber}` : null,
    chunk.startTimeSeconds != null
      ? `${Math.round(chunk.startTimeSeconds)}s\u2013${Math.round(chunk.endTimeSeconds ?? chunk.startTimeSeconds)}s`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const label = location
    ? `[${index + 1}] "${chunk.sourceTitle}" (${location})`
    : `[${index + 1}] "${chunk.sourceTitle}"`;

  return `${label}\n${chunk.content}`;
}

export function formatRetrievedChunks(chunks: RetrievedChunk[]): string {
  return chunks.map(formatRetrievedChunk).join("\n\n");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Formats chunks into the same citable block as {@link formatRetrievedChunks},
 * but stops adding chunks once `maxTokens` would be exceeded — chunks are
 * assumed to already be ordered best-first (post-rerank), so this keeps
 * the highest-relevance ones and drops the tail rather than truncating
 * mid-chunk. Always includes at least the first chunk, even if it alone
 * exceeds the budget, so a single oversized chunk can't produce empty context.
 */
export function buildBudgetedChunkBlock(
  chunks: RetrievedChunk[],
  maxTokens: number,
): { text: string; includedChunks: RetrievedChunk[] } {
  const includedChunks: RetrievedChunk[] = [];
  const formattedBlocks: string[] = [];
  let usedTokens = 0;

  for (const chunk of chunks) {
    const formatted = formatRetrievedChunk(chunk, includedChunks.length);
    const tokens = estimateTokens(formatted);

    // Stop at the first chunk that doesn't fit rather than skipping ahead
    // to a smaller, lower-ranked one — chunks are best-first, so once the
    // next-best doesn't fit, nothing after it should jump the queue.
    if (includedChunks.length > 0 && usedTokens + tokens > maxTokens) {
      break;
    }

    includedChunks.push(chunk);
    formattedBlocks.push(formatted);
    usedTokens += tokens;
  }

  return { text: formattedBlocks.join("\n\n"), includedChunks };
}