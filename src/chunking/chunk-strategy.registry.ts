import { ChunkStrategyName } from '../common-types/enums';
import type { IChunkStrategy } from './chunk-strategy.interface';
import { paragraphChunkStrategy } from './strategies/paragraph.strategy';
import { recursiveChunkStrategy } from './strategies/recursive.strategy';
import { headingChunkStrategy } from './strategies/heading.strategy';
import { markdownHeadingChunkStrategy } from './strategies/markdown-heading-strategy';
import { pageChunkStrategy } from './strategies/page-strategy';
import { slideChunkStrategy } from './strategies/slide.strategy';
import { transcriptChunkStrategy } from './strategies/transcript.strategy';
import { researchPaperChunkStrategy } from './strategies/research-paper.strategy';
import { semanticChunkStrategy } from './strategies/semantic.strategy';

/**
 * chunk-strategy.registry.ts
 *
 * Map from `ChunkStrategyName` to its `IChunkStrategy` instance, populated once at
 * module load. `chunk-strategy.selector.ts` (and, through it, `ChunkingStage`) depends
 * only on this registry - never on a concrete strategy class - so adding a new
 * strategy later is a one-line addition here, not a change to the selector or the stage.
 */
const registry = new Map<ChunkStrategyName, IChunkStrategy>([
  [ChunkStrategyName.PARAGRAPH, paragraphChunkStrategy],
  [ChunkStrategyName.RECURSIVE, recursiveChunkStrategy],
  [ChunkStrategyName.HEADING, headingChunkStrategy],
  [ChunkStrategyName.MARKDOWN_HEADING, markdownHeadingChunkStrategy],
  [ChunkStrategyName.PAGE, pageChunkStrategy],
  [ChunkStrategyName.SLIDE, slideChunkStrategy],
  [ChunkStrategyName.TRANSCRIPT, transcriptChunkStrategy],
  [ChunkStrategyName.RESEARCH_PAPER, researchPaperChunkStrategy],
  [ChunkStrategyName.SEMANTIC, semanticChunkStrategy],
]);

/** Looks up a strategy by name. Returns `undefined` rather than throwing, so callers
 *  (like `chunk-strategy.selector.ts`) decide how to handle an unknown name. */
export function getChunkStrategy(name: ChunkStrategyName): IChunkStrategy | undefined {
  return registry.get(name);
}

/** Returns every registered strategy - e.g. for a future admin/debug view listing
 *  available strategies, or for validating the registry is fully populated at boot. */
export function listChunkStrategies(): readonly IChunkStrategy[] {
  return Array.from(registry.values());
}