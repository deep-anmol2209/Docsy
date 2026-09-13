/**
 * Reciprocal Rank Fusion — merges multiple ranked lists (dense x N query
 * variants, lexical x 1) into a single fused ranking, using the standard
 * `score = sum(1 / (k + rank))` formula. Items appearing in more lists,
 * and appearing near the top of the lists they're in, score highest.
 */

import { RRF_K } from "@/lib/ai-config";

export function reciprocalRankFusion(
  rankedLists: Array<Array<{ id: string }>>,
  k: number = RRF_K,
): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const rank = index + 1;
      const contribution = 1 / (k + rank);
      scores.set(item.id, (scores.get(item.id) ?? 0) + contribution);
    });
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}