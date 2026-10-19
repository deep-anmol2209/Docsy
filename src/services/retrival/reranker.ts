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
import { CHAT_MODEL, RERANK_RELEVANCE_THRESHOLD } from "@/lib/ai-config";
import { RERANK_CANDIDATES_SYSTEM_PROMPT } from "@/src/config/prompts";
import { logger } from "@/src/utils/logger";
import { choice,score, TypeSafeClient } from "@typesafe-ai/sdk";
export type RerankCandidate = {
  id: string;
  content: string;
};

export type RankedCandidate = {
  id: string;
  score: number;
};

/**
 * Scores each candidate's relevance to `query` on a 0-10 scale using an LLM pass,
 * sorts descending by score, and filters out candidates below `threshold`.
 *
 * If the LLM call fails or returns unparseable content, returns an empty array
 * rather than falling back to unverified candidates, preventing false citations.
 */
// export async function rerankCandidates(
//   query: string,
//   candidates: RerankCandidate[],
//   threshold: number = RERANK_RELEVANCE_THRESHOLD,
// ): Promise<RankedCandidate[]> {
//   if (candidates.length === 0) {
//     return [];
//   }

//   try {
//     const numbered = candidates
//       .map((c, i) => `[${i}] ${c.content.slice(0, 800)}`)
//       .join("\n\n");

//     const client = getChatClient("groq");
//     const completion = await client.chat.completions.create({
//       model: CHAT_MODEL,
//       temperature: 0,
//       messages: [
//         {
//           role: "system",
//           content: RERANK_CANDIDATES_SYSTEM_PROMPT,
//         },
//         {
//           role: "user",
//           content: `Query: ${query}\n\nPassages:\n${numbered}`,
//         },
//       ],
//     });

//     const raw = completion.choices[0]?.message?.content ?? "";
//     const firstBracket = raw.indexOf("[");
//     const lastBracket = raw.lastIndexOf("]");

//     if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
//       throw new Error(`Reranker response did not contain a valid JSON array: ${raw}`);
//     }

//     const jsonText = raw.slice(firstBracket, lastBracket + 1);
//     const parsed: Array<{ index: number; score: number }> = JSON.parse(jsonText);

//     if (!Array.isArray(parsed)) {
//       throw new Error("Reranker response did not parse to an array");
//     }

//     const scoreByIndex = new Map<number, number>();
//     for (const item of parsed) {
//       if (
//         typeof item.index === "number" &&
//         typeof item.score === "number" &&
//         !Number.isNaN(item.score)
//       ) {
//         scoreByIndex.set(item.index, item.score);
//       }
//     }

//     const scoredCandidates: RankedCandidate[] = candidates.map((c, i) => ({
//       id: c.id,
//       score: scoreByIndex.get(i) ?? 0,
//     }));

//     console.log(`candidate count before reranking: ${candidates.length}`);
//     console.log(
//       "reranker scores:",
//       scoredCandidates.map((c) => ({ id: c.id, score: c.score })),
//     );
//     console.log(`relevance threshold: ${threshold}`);

//     const sorted = scoredCandidates.sort((a, b) => b.score - a.score);
//     const relevant = sorted.filter((c) => c.score >= threshold);

//     console.log(`relevant candidate count: ${relevant.length}`);

//     return relevant;
//   } catch (error) {
//     logger.error(
//       "Reranking failed; returning no relevant candidates to avoid false citations",
//       error,
//     );
//     return [];
//   }
// }

export async function rerankCandidates(
  query: string,
  candidates: RerankCandidate[],
  threshold: number = RERANK_RELEVANCE_THRESHOLD,
): Promise<RankedCandidate[]> {

  const jevClient= new TypeSafeClient({
  apiKey: process.env.JEV_API_KEY!
})
  if (candidates.length === 0) {
    return [];
  }

  try {
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const response = await jevClient.systemOne({
          state: {
            query,
            passage: candidate.content.slice(0, 800),
          },
          questions: {
            relevance: score(
                "How relevant is this passage to answering the query?",
               [
                "0-2: Completely irrelevant or unrelated to the query",
                "3-4: Slightly related, but does not help answer the query",
                "5-6: Partially relevant and contains some useful information",
                "7-8: Highly relevant and provides substantial information useful for answering the query",
                "9-10: Directly answers the query with highly relevant and specific information",
              ],
            ),
          },
        });

       
const rawScore = response.answers.relevance.score;

// Convert Jev's 0–4 score to the existing 0–10 scale.
const normalizedScore = Math.max(
  0,
  Math.min(10, (rawScore / 4) * 10),
);

return {
  id: candidate.id,
  score: normalizedScore,
};

      }),
    );

    console.log("reranker scores:", scoredCandidates);

    const sorted = scoredCandidates.sort(
      (a, b) => b.score - a.score,
    );

    const relevant = sorted.filter(
      (candidate) => candidate.score >= threshold,
    );

    console.log(`relevance threshold: ${threshold}`);
    console.log(`relevant candidate count: ${relevant.length}`);

    return relevant;
  } catch (error) {
    logger.error(
      "Reranking failed; returning no relevant candidates to avoid false citations",
      error,
    );

    return [];
  }
}