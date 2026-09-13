import { BlockType } from '../common-types/enums';
import type { DocumentBlock } from '../common-types/document-model';
import type { ChunkPosition, DraftChunk } from '../common-types/chunk-model';
import type { CommonDocument } from '../common-types/document-model';
import type { ChunkStrategyName } from '../common-types/enums';

/**
 * chunk-text-utils.ts
 *
 * Shared helpers used by every chunking strategy so each one doesn't reimplement the
 * same "flatten blocks into text, split it, then map each split back to structural
 * position metadata" bookkeeping. Deliberately free of any strategy-specific
 * splitting configuration (chunk size, separators, ...) - each strategy owns those.
 *
 * NOTE: this file is not part of the original migration plan's file list - it was
 * added to avoid duplicating this offset-mapping and grouping logic across all nine
 * strategy files. Nothing here is strategy-specific.
 */

/** Separator inserted between consecutive blocks when concatenating them into one text blob. */
const BLOCK_SEPARATOR = '\n\n';

/** One block's character span within a concatenated text blob built by `concatenateBlocks`. */
export interface BlockSpan {
  readonly block: DocumentBlock;
  readonly start: number;
  readonly end: number;
}

/** Concatenates blocks into one text blob (joined by a blank line), recording each
 *  block's character span within that blob so splits can later be mapped back to
 *  page / heading / slide / timestamp metadata via `resolvePosition`. */
export function concatenateBlocks(blocks: readonly DocumentBlock[]): {
  text: string;
  spans: readonly BlockSpan[];
} {
  let text = '';
  const spans: BlockSpan[] = [];

  for (const block of blocks) {
    if (text.length > 0) {
      text += BLOCK_SEPARATOR;
    }
    const start = text.length;
    text += block.content;
    spans.push({ block, start, end: text.length });
  }

  return { text, spans };
}

/** Locates each split's [start, end) offset within the original concatenated text, in
 *  order. A split that can't be located (e.g. a splitter normalized whitespace in a
 *  way that breaks an exact substring match) maps to `null` - callers should treat
 *  that as "position unknown" rather than fail the whole chunk. */
export function locateSplitOffsets(
  fullText: string,
  splits: readonly string[],
): ReadonlyArray<{ start: number; end: number } | null> {
  const offsets: Array<{ start: number; end: number } | null> = [];
  let searchFrom = 0;

  for (const split of splits) {
    const trimmed = split.trim();
    if (trimmed.length === 0) {
      offsets.push(null);
      continue;
    }

    const index = fullText.indexOf(trimmed, Math.max(0, searchFrom - trimmed.length));
    if (index === -1) {
      offsets.push(null);
      continue;
    }

    offsets.push({ start: index, end: index + trimmed.length });
    searchFrom = index + trimmed.length;
  }

  return offsets;
}

/** Resolves structural position metadata for a [start, end) range by finding every
 *  block span it overlaps. `page` / `slideNumber` / start-timestamp are taken from
 *  the first overlapping block; `heading` is the nearest preceding `HEADING` block's
 *  text (so even a chunk that doesn't itself contain a heading can still say what
 *  section it's under); `blockOrderRange` spans every overlapping block's `order`. */
export function resolvePosition(
  spans: readonly BlockSpan[],
  range: { start: number; end: number } | null,
): ChunkPosition {
  if (!range) {
    return {};
  }

  const overlapping = spans.filter((span) => span.start < range.end && span.end > range.start);
  if (overlapping.length === 0) {
    return {};
  }

  const first = overlapping[0].block;
  const last = overlapping[overlapping.length - 1].block;

  return {
    page: first.page,
    slideNumber: first.slideNumber,
    startTimeSeconds: first.startTimeSeconds,
    endTimeSeconds: last.endTimeSeconds ?? first.endTimeSeconds,
    heading: findNearestHeading(spans, overlapping[0]),
    blockOrderRange: [first.order, last.order],
  };
}

/** Walks backward from `fromSpan` (inclusive) to find the nearest `HEADING` block. */
function findNearestHeading(spans: readonly BlockSpan[], fromSpan: BlockSpan): string | undefined {
  const fromIndex = spans.indexOf(fromSpan);
  for (let i = fromIndex; i >= 0; i -= 1) {
    if (spans[i].block.type === BlockType.HEADING) {
      return spans[i].block.content;
    }
  }
  return undefined;
}

/** Rough token-count estimate (~4 characters per token). Used only for the
 *  informational `Chunk.tokenCount` field - never to control a splitter's behavior. */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/** Converts a token-based size budget (as specified in each strategy's configuration)
 *  into an approximate character budget for the character-based LangChain splitters. */
export function tokensToChars(tokens: number): number {
  return tokens * 4;
}

/** Assembles a `DraftChunk`, filling in identity fields from the parent document and
 *  estimating `tokenCount` from the final content - so each strategy only needs to
 *  supply `order`, `content`, and `position`. */
export function toDraftChunk(params: {
  document: CommonDocument;
  strategy: ChunkStrategyName;
  order: number;
  content: string;
  position: ChunkPosition;
}): DraftChunk {
  return {
    documentId: params.document.documentId,
    sourceId: params.document.sourceId,
    order: params.order,
    content: params.content,
    strategy: params.strategy,
    position: params.position,
    tokenCount: estimateTokenCount(params.content),
  };
}

/** A contiguous run of blocks under one heading (or, for `heading` `undefined`, the
 *  leading run of blocks that appears before any heading at all). */
export interface BlockSection {
  readonly heading?: string;
  readonly blocks: readonly DocumentBlock[];
}

/** Groups a flat block list into sections, starting a new section at each `HEADING`
 *  block encountered in document order. Used by strategies that key off the
 *  document's own block structure rather than Markdown syntax or `parentId` links. */
export function groupBlocksByHeading(blocks: readonly DocumentBlock[]): BlockSection[] {
  const sections: BlockSection[] = [];
  let currentHeading: string | undefined;
  let currentBlocks: DocumentBlock[] = [];

  const flush = (): void => {
    if (currentBlocks.length > 0) {
      sections.push({ heading: currentHeading, blocks: currentBlocks });
    }
  };

  for (const block of blocks) {
    if (block.type === BlockType.HEADING) {
      flush();
      currentHeading = block.content;
      currentBlocks = [block];
    } else {
      currentBlocks.push(block);
    }
  }
  flush();

  return sections;
}

/** Groups blocks by their nearest ancestor `HEADING` block, resolved by walking
 *  `parentId` links rather than simple document-order proximity - this is what lets a
 *  table or paragraph stay grouped with its actual owning section (e.g. from
 *  Unstructured's `parent_id`) even when other, unrelated content sits between them
 *  in raw block order. Blocks with no resolvable heading ancestor form one leading,
 *  untitled section. */
export function groupBlocksByParentId(blocks: readonly DocumentBlock[]): BlockSection[] {
  const blockById = new Map(blocks.map((block) => [block.id, block]));

  const resolveHeadingFor = (block: DocumentBlock): DocumentBlock | undefined => {
    let current: DocumentBlock | undefined = block;
    const seen = new Set<string>();

    while (current) {
      if (current.type === BlockType.HEADING) {
        return current;
      }
      if (!current.parentId || seen.has(current.parentId)) {
        return undefined;
      }
      seen.add(current.parentId);
      current = blockById.get(current.parentId);
    }

    return undefined;
  };

  const headingOrder: string[] = [];
  const headingById = new Map<string, DocumentBlock>();
  const blocksByHeadingId = new Map<string, DocumentBlock[]>();
  const unheaded: DocumentBlock[] = [];

  for (const block of blocks) {
    const heading = block.type === BlockType.HEADING ? block : resolveHeadingFor(block);

    if (!heading) {
      unheaded.push(block);
      continue;
    }

    if (!blocksByHeadingId.has(heading.id)) {
      blocksByHeadingId.set(heading.id, []);
      headingById.set(heading.id, heading);
      headingOrder.push(heading.id);
    }
    blocksByHeadingId.get(heading.id)!.push(block);
  }

  const sections: BlockSection[] = [];

  if (unheaded.length > 0) {
    sections.push({ heading: undefined, blocks: unheaded });
  }

  for (const headingId of headingOrder) {
    sections.push({
      heading: headingById.get(headingId)!.content,
      blocks: blocksByHeadingId.get(headingId)!,
    });
  }

  return sections;
}

/** One page's worth of blocks, in ascending page-number order. */
export interface PageGroup {
  readonly pageNumber: number;
  readonly blocks: readonly DocumentBlock[];
}

/** Groups blocks by `page` (blocks without one are treated as page 1), sorted ascending. */
export function groupBlocksByPage(blocks: readonly DocumentBlock[]): PageGroup[] {
  const byPage = new Map<number, DocumentBlock[]>();

  for (const block of blocks) {
    const page = block.page ?? 1;
    if (!byPage.has(page)) {
      byPage.set(page, []);
    }
    byPage.get(page)!.push(block);
  }

  return Array.from(byPage.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNumber, pageBlocks]) => ({ pageNumber, blocks: pageBlocks }));
}

/** One slide's worth of blocks, in ascending slide-number order. */
export interface SlideGroup {
  readonly slideNumber: number;
  readonly blocks: readonly DocumentBlock[];
}

/** Groups blocks by `slideNumber` (blocks without one are treated as slide 1), sorted ascending. */
export function groupBlocksBySlide(blocks: readonly DocumentBlock[]): SlideGroup[] {
  const bySlide = new Map<number, DocumentBlock[]>();

  for (const block of blocks) {
    const slide = block.slideNumber ?? 1;
    if (!bySlide.has(slide)) {
      bySlide.set(slide, []);
    }
    bySlide.get(slide)!.push(block);
  }

  return Array.from(bySlide.entries())
    .sort(([a], [b]) => a - b)
    .map(([slideNumber, slideBlocks]) => ({ slideNumber, blocks: slideBlocks }));
}

/** A small group of consecutive transcript lines (SRT cues) destined to become one
 *  chunk, along with the group's overall time span. */
export interface TranscriptChunkGroup {
  readonly lines: readonly DocumentBlock[];
  readonly startTimeSeconds: number;
  readonly endTimeSeconds: number;
}

/** Matches a line ending in sentence-final punctuation (optionally followed by a
 *  closing quote/bracket), used to prefer closing a transcript chunk at a sentence
 *  boundary rather than mid-thought. */
const SENTENCE_END_PATTERN = /[.?!]["')\]]*\s*$/;

/**
 * Groups transcript-segment blocks (already filtered to `BlockType.TRANSCRIPT_SEGMENT`
 * by the caller) into small, sentence-boundary-aware chunks - never into one big blob.
 *
 * The whole point of keeping chunks small here is timestamp precision: a chunk only
 * ever carries *one* start time in `ChunkPosition.startTimeSeconds`, so the bigger a
 * transcript chunk is, the more that one timestamp can be off from wherever inside it
 * the actually-relevant sentence was said. Keeping each chunk to roughly
 * `minChunkSeconds`-`maxChunkSeconds` of dialogue (and preserving every individual
 * line's own timestamp via `TranscriptLine`, separately from this grouping) is what
 * keeps that gap small, while a second-stage within-chunk line lookup closes it
 * entirely.
 *
 * A group closes as soon as EITHER:
 * - it has run at least `minChunkSeconds` AND the current line ends a sentence
 *   (so boundaries land on natural speech breaks whenever possible), or
 * - it has run at least `maxChunkSeconds` regardless of punctuation (a safety valve
 *   for auto-generated captions that may lack sentence-ending punctuation entirely).
 */
export function groupTranscriptLinesIntoChunks(
  lines: readonly DocumentBlock[],
  options: { readonly minChunkSeconds: number; readonly maxChunkSeconds: number },
): TranscriptChunkGroup[] {
  const groups: TranscriptChunkGroup[] = [];
  let current: DocumentBlock[] = [];
  let groupStart: number | null = null;

  const flush = (endTime: number): void => {
    if (current.length === 0 || groupStart === null) {
      return;
    }
    groups.push({ lines: current, startTimeSeconds: groupStart, endTimeSeconds: endTime });
    current = [];
    groupStart = null;
  };

  for (const line of lines) {
    const lineStart = line.startTimeSeconds ?? 0;
    const lineEnd = line.endTimeSeconds ?? lineStart;

    if (groupStart === null) {
      groupStart = lineStart;
    }

    current.push(line);

    const elapsed = lineEnd - groupStart;
    const endsSentence = SENTENCE_END_PATTERN.test(line.content.trim());
    const shouldClose =
      elapsed >= options.maxChunkSeconds || (elapsed >= options.minChunkSeconds && endsSentence);

    if (shouldClose) {
      flush(lineEnd);
    }
  }

  if (current.length > 0) {
    const lastLine = current[current.length - 1];
    flush(lastLine.endTimeSeconds ?? lastLine.startTimeSeconds ?? groupStart ?? 0);
  }

  return groups;
}

const MARKDOWN_HEADING_PATTERN = /^#{1,6}\s+(.+)$/m;

/** Best-effort extraction of a chunk's section title from its own leading Markdown
 *  heading line (e.g. "## Methods"), used when a Markdown splitter's own header
 *  metadata isn't available at this call site. */
export function extractLeadingMarkdownHeading(content: string): string | undefined {
  const match = content.match(MARKDOWN_HEADING_PATTERN);
  return match ? match[1].trim() : undefined;
}