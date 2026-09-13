/**
 * Query understanding / transformation (Phase 5, part 1).
 *
 * Produces additional search-oriented variants of the user's raw message,
 * each of which gets embedded and dense-searched separately by the
 * retrieval service; results are merged via RRF. Techniques:
 *
 *   - Rewrite: turn a short/ambiguous message into a standalone search query.
 *   - Step-back (optional, off by default): a broader question behind the specific one.
 *   - HyDE: a hypothetical answer passage, embedded instead of the bare question.
 *
 * All three are skippable to avoid unnecessary LLM calls — see
 * `looksLikeWellFormedQuery` and the `*_ENABLED` flags in `ai-config.ts`.
 */

import { getChatClient, openai } from "@/lib/openai";
import {
  CHAT_MODEL,
  QUERY_REWRITE_ENABLED,
  STEP_BACK_ENABLED,
  HYDE_ENABLED,
} from "@/lib/ai-config";
import {
  HYDE_SYSTEM_PROMPT,
  QUERY_REWRITE_SYSTEM_PROMPT,
  STEP_BACK_SYSTEM_PROMPT,
} from "@/src/config/prompts";
import { logger } from "@/src/utils/logger";

export type QueryVariants = {
  /** The user's raw message, always searched. */
  original: string;
  /** Cleaned-up standalone version of `original`, if rewriting ran and changed anything. */
  rewritten?: string;
  /** A broader/more general question, if step-back ran. */
  stepBack?: string;
  /** A hypothetical answer passage, if HyDE ran — embedded, never shown to the user. */
  hyde?: string;
};

/**
 * Heuristic gate so we don't spend an LLM call rewriting a query that's
 * already clear: a full question, reasonably long, no obvious pronoun-only
 * references back to earlier turns.
 */
function looksLikeWellFormedQuery(query: string): boolean {
  const trimmed = query.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const isQuestionShaped = /[?]$/.test(trimmed) || /^(what|why|how|when|where|who|which|explain|describe|compare|list|summarize)\b/i.test(trimmed);

  return wordCount >= 5 && isQuestionShaped;
}

async function complete(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const client = getChatClient("groq")
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    logger.error("Query transformation LLM call failed", error);
    return null;
  }
}

async function rewriteQuery(query: string): Promise<string | undefined> {
  const result = await complete(QUERY_REWRITE_SYSTEM_PROMPT, query);

  return result && result.toLowerCase() !== query.trim().toLowerCase() ? result : undefined;
}

async function stepBackQuery(query: string): Promise<string | undefined> {
  return (
    (await complete(STEP_BACK_SYSTEM_PROMPT, query)) ?? undefined
  );
}

async function hydeAnswer(query: string): Promise<string | undefined> {
  return (
    (await complete(HYDE_SYSTEM_PROMPT, query)) ?? undefined
  );
}

export async function buildQueryVariants(query: string): Promise<QueryVariants> {
  const variants: QueryVariants = { original: query };

  const skipRewrite = looksLikeWellFormedQuery(query);

  const [rewritten, stepBack, hyde] = await Promise.all([
    QUERY_REWRITE_ENABLED && !skipRewrite ? rewriteQuery(query) : Promise.resolve(undefined),
    STEP_BACK_ENABLED ? stepBackQuery(query) : Promise.resolve(undefined),
    HYDE_ENABLED ? hydeAnswer(query) : Promise.resolve(undefined),
  ]);

  if (rewritten) variants.rewritten = rewritten;
  if (stepBack) variants.stepBack = stepBack;
  if (hyde) variants.hyde = hyde;

  return variants;
}