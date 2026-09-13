import { BlockType, ChunkStrategyName } from '../../common-types/enums';
import type { CommonDocument } from '../../common-types/document-model';
import type { DraftChunk, TranscriptLine } from '../../common-types/chunk-model';
import type { IChunkStrategy } from '../chunk-strategy.interface';
import { groupTranscriptLinesIntoChunks, toDraftChunk } from '../chunk-text-utils';

/**
 * transcript.strategy.ts
 *
 * Best for: YouTube and other time-coded transcript sources (SRT-style captions).
 *
 * The problem this strategy is specifically designed around isn't finding the right
 * neighborhood of a transcript via search - that already works. It's that a chunk can
 * only ever report *one* timestamp (`ChunkPosition.startTimeSeconds`), so if a chunk
 * spans several minutes of dialogue, that one timestamp can land far from wherever
 * inside it the actually-relevant line was said.
 *
 * So instead of grouping many minutes of transcript into one chunk and losing each
 * line's own timing (the old approach), this strategy:
 *
 * 1. Treats every `TRANSCRIPT_SEGMENT` block as one small, independently-timed line
 *    (a single SRT cue) - never concatenated into a single text blob that would
 *    discard anything but the first line's start time.
 * 2. Groups consecutive lines into small chunks - roughly `MIN_CHUNK_SECONDS` to
 *    `MAX_CHUNK_SECONDS` of dialogue, closing on a sentence boundary when possible -
 *    via `groupTranscriptLinesIntoChunks`. Small chunks alone shrink the worst-case
 *    gap between "the chunk's timestamp" and "the actual line's timestamp" to a
 *    single dialogue window instead of several minutes.
 * 3. Crucially, still preserves every original line's own start/end timestamp inside
 *    `ChunkPosition.transcriptLines` - not just the chunk's overall span. This is
 *    what a second-stage, within-chunk lookup (e.g. scoring the query against each
 *    line with a cross-encoder once semantic search has already found the right
 *    chunk) needs to return the *specific line's* timestamp rather than the chunk's
 *    start time. That second stage is a query-time/retrieval concern, not an
 *    ingestion concern - it lives outside this strategy, but only works at all if the
 *    per-line timestamps survive ingestion, which is what this strategy guarantees.
 *
 * No LangChain text splitter is used here (unlike every other strategy): chunks are
 * already small by construction (bounded to `MAX_CHUNK_SECONDS` of real-world
 * dialogue, which is normally well under any reasonable character budget), and
 * splitting on anything other than original line boundaries would defeat the entire
 * point - every chunk boundary must land exactly on a line boundary so line-level
 * timestamps stay exact.
 */

const MIN_CHUNK_SECONDS = 30;
const MAX_CHUNK_SECONDS = 60;

export class TranscriptChunkStrategy implements IChunkStrategy {
  public readonly name = ChunkStrategyName.TRANSCRIPT;

  public async chunk(document: CommonDocument): Promise<DraftChunk[]> {
    const lines = document.blocks.filter((block) => block.type === BlockType.TRANSCRIPT_SEGMENT);

    const groups = groupTranscriptLinesIntoChunks(lines, {
      minChunkSeconds: MIN_CHUNK_SECONDS,
      maxChunkSeconds: MAX_CHUNK_SECONDS,
    });

    return groups.map((group, index) => {
      const transcriptLines: TranscriptLine[] = group.lines.map((line) => ({
        text: line.content,
        startTimeSeconds: line.startTimeSeconds ?? group.startTimeSeconds,
        endTimeSeconds: line.endTimeSeconds ?? line.startTimeSeconds ?? group.startTimeSeconds,
      }));

      // Lines are joined with a single space, not a paragraph break - these are
      // consecutive spoken-word cues, not separate paragraphs, and a cross-encoder
      // scoring individual lines in the second stage works from `transcriptLines`
      // directly rather than re-splitting this joined content.
      const content = transcriptLines.map((line) => line.text).join(' ');

      return toDraftChunk({
        document,
        strategy: this.name,
        order: index,
        content,
        position: {
          startTimeSeconds: group.startTimeSeconds,
          endTimeSeconds: group.endTimeSeconds,
          blockOrderRange: [group.lines[0].order, group.lines[group.lines.length - 1].order],
          transcriptLines,
        },
      });
    });
  }
}

export const transcriptChunkStrategy = new TranscriptChunkStrategy();