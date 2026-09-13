/**
 * Reranking — the "cross-encoder" step of the retrieval pipeline.
 *
 * No dedicated cross-encoder / reranking model is configured in this
 * project (no Cohere/Voyage key, no local model server), so this uses a
 * single batched LLM call to score each candidate's relevance to the
 * query on a 0-10 scale, and sorts by that. It's not a real cross-encoder,
 * but it's the same *role* in the pipeline — a query-aware relevance pass
 * over a small candidate pool, after cheap first-stage retrieval. Swap in
 * a real cross-encoder/reranking API here later without touching callers.
 */

import { getChatClient, openai } from "@/lib/openai";
import { CHAT_MODEL } from "@/lib/ai-config";
import { RERANK_CANDIDATES_SYSTEM_PROMPT } from "@/src/config/prompts";
import { logger } from "@/src/utils/logger";

export type RerankCandidate = {
  id: string;
  content: string;
};

/**
 * Returns candidate ids sorted by relevance to `query`, most relevant
 * first. Falls back to the input order (i.e. the RRF-fused order) if the
 * LLM call fails or returns something unparseable, so a reranker outage
 * degrades retrieval quality rather than breaking chat.
 */
export async function rerankCandidates(
  query: string,
  candidates: RerankCandidate[],
): Promise<string[]> {
  if (candidates.length === 0) {
    return [];
  }

  const fallbackOrder = candidates.map((c) => c.id);

  try {
    const numbered = candidates
      .map((c, i) => `[${i}] ${c.content.slice(0, 800)}`)
      .join("\n\n");

    const client = getChatClient("groq")
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: RERANK_CANDIDATES_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Query: ${query}\n\nPassages:\n${numbered}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonText = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    const parsed: Array<{ index: number; score: number }> = JSON.parse(jsonText);

    const scoreByIndex = new Map(parsed.map((p) => [p.index, p.score]));

    return candidates
      .map((c, i) => ({ id: c.id, score: scoreByIndex.get(i) ?? -1 }))
      .sort((a, b) => b.score - a.score)
      .map((c) => c.id);
  } catch (error) {
    logger.error("Reranking failed; falling back to fused order", error);
    return fallbackOrder;
  }
}