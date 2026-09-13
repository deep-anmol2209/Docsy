/**
 * User-level persistent memory (Phase 6) — Mem0 hosted platform.
 *
 * Scope, per the project's memory architecture: durable, cross-conversation
 * facts about the *user* (preferences, standing instructions, long-term
 * goals) — never notebook content, retrieved chunks, chat history, or
 * conversation summaries. Those already live in Postgres (Conversation /
 * Message / Chunk) and have no business in Mem0.
 *
 * "Use Mem0's inference capability selectively" (spec) is implemented as:
 * we don't run our own LLM classifier before every `add()` call (that
 * would just be a second, redundant extraction step) — we lean on Mem0
 * hosted's own `infer: true` extraction, which already discards
 * non-memorable exchanges. What we control on our side is *when* we call
 * it at all: only after a successful assistant turn, with the raw
 * user+assistant pair (not the retrieved notebook context, not the
 * summary), and with an early bail on turns that are too short to plausibly
 * contain a durable fact — mainly to save a network round trip, not as a
 * correctness mechanism.
 */

import { getMem0Client } from "@/lib/mem0-client";
import { MEM0_MEMORY_LIMIT } from "@/lib/ai-config";
import { logger } from "@/src/utils/logger";

const MIN_EXTRACTABLE_LENGTH = 12;

/**
 * Semantic search over the user's durable memories, for injecting into
 * chat context. Best-effort — returns `[]` on any failure or when Mem0
 * isn't configured, never throws.
 */
export async function searchUserMemories(
  userId: string,
  query: string,
  limit: number = MEM0_MEMORY_LIMIT,
): Promise<string[]> {
  const client = getMem0Client();

  if (!client) {
    return [];
  }

  try {
    const results = await client.search(query, {filters:{
      user_id: userId,
    
    },
  topK: limit});

    return (results.results ?? [])
      .map((result: { memory?: string }) => result.memory)
      .filter((memory: string | undefined): memory is string => !!memory);
  } catch (error) {
    logger.error("Mem0 search failed; continuing without user memory", error);
    return [];
  }
}

/**
 * Extracts and stores durable facts from a completed chat turn. Meant to
 * be called *after* the assistant's response is already persisted and
 * streamed to the client — never on the request-critical path.
 */
export async function extractMemoriesFromTurn(
  userId: string,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  const client = getMem0Client();

  if (!client) {
    return;
  }

  if (userMessage.trim().length < MIN_EXTRACTABLE_LENGTH) {
    return;
  }

  try {
    await client.add(
      [
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantMessage },
      ],
      { user_id: userId, infer: true },
    );
  } catch (error) {
    logger.error("Mem0 memory extraction failed", error);
  }
}