/**
 * Second-stage, within-chunk timestamp resolution for transcript sources.
 *
 * `TranscriptChunkStrategy` (ingestion) groups a transcript into small,
 * independently-timed chunks specifically so this stage has something
 * precise to work with — but a chunk still spans up to ~60s of dialogue
 * and can only be *found* via semantic search at the chunk level. Once
 * the right chunk has been found, this scores the query against each
 * individual line inside it (via the same LLM relevance-scoring approach
 * used by `reranker.ts` — no dedicated cross-encoder is configured in
 * this project, see that file's header for the same trade-off) and
 * returns the single best-matching line's own start/end time, instead of
 * the chunk's overall (first-line) timestamp.
 */

import { getChatClient, openai } from "@/lib/openai";
import { CHAT_MODEL } from "@/lib/ai-config";
import { RESOLVE_TRANSCRIPT_LINE_SYSTEM_PROMPT } from "@/src/config/prompts";
import { logger } from "@/src/utils/logger";
import type { TranscriptLine } from "@/src/common-types/chunk-model";

export type { TranscriptLine };

export type ResolvedTimestamp = {
  startTimeSeconds: number;
  endTimeSeconds: number;
};

/**
 * Returns the timestamp of whichever line in `lines` best answers `query`,
 * or `null` if there's nothing to resolve (empty input) or the scoring
 * call fails — callers should fall back to the chunk's own span in that
 * case rather than fail the whole retrieval.
 */
export async function resolveTranscriptLineTimestamp(
  query: string,
  lines: TranscriptLine[],
): Promise<ResolvedTimestamp | null> {
  if (lines.length === 0) {
    return null;
  }

  // Nothing to disambiguate — the chunk's own span already *is* this line's span.
  if (lines.length === 1) {
    return { startTimeSeconds: lines[0].startTimeSeconds, endTimeSeconds: lines[0].endTimeSeconds };
  }

  try {
    const numbered = lines.map((line, i) => `[${i}] ${line.text}`).join("\n");
    const client = getChatClient("groq")
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: RESOLVE_TRANSCRIPT_LINE_SYSTEM_PROMPT,
        },
        { role: "user", content: `Query: ${query}\n\nLines:\n${numbered}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed: { index?: number } = JSON.parse(jsonText);

    const line =
      typeof parsed.index === "number" && parsed.index >= 0 && parsed.index < lines.length
        ? lines[parsed.index]
        : null;

    if (!line) {
      return null;
    }

    return { startTimeSeconds: line.startTimeSeconds, endTimeSeconds: line.endTimeSeconds };
  } catch (error) {
    logger.error("Transcript line resolution failed; falling back to chunk-level timestamp", error);
    return null;
  }
}