import type { DraftChunk } from '../common-types/chunk-model';

/**
 * chunk-postprocessor.ts
 *
 * Clean-up passes applied uniformly after any strategy runs, so individual strategies
 * don't each need to reimplement the same noise-filtering logic:
 *
 * 1. Minimum-length filter - drops chunks that are pure noise (a lone section header,
 *    a page number, a stray caption) with little retrieval value on their own.
 * 2. Deduplication - drops exact-duplicate content, which legitimately happens when
 *    chunk overlap causes a short section to reappear unchanged across two
 *    consecutive chunks.
 *
 * Re-numbers `order` after filtering so the remaining chunks stay a contiguous,
 * zero-based sequence - downstream stages (enrichment, embedding) should never see a
 * gap in `order` caused by a dropped chunk.
 */

const MIN_CONTENT_LENGTH = 50;

export function postprocess(chunks: readonly DraftChunk[]): DraftChunk[] {
  const seenContent = new Set<string>();
  const kept: DraftChunk[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.content.trim();

    if (trimmed.length < MIN_CONTENT_LENGTH) {
      continue;
    }

    if (seenContent.has(trimmed)) {
      continue;
    }

    seenContent.add(trimmed);
    kept.push(chunk);
  }

  console.log('final chunks', kept);

  return kept.map((chunk, index) => ({ ...chunk, order: index }));
}