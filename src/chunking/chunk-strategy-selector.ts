import type { ChunkStrategyName } from '../common-types/enums';
import type { IChunkStrategy } from './chunk-strategy.interface';
import { getChunkStrategy } from './chunk-strategy.registry';

/**
 * chunk-strategy.selector.ts
 *
 * Resolves a `ChunkStrategyName` to its registered `IChunkStrategy`, throwing a clear
 * error for an unregistered name rather than letting `ChunkingStage` fail later with a
 * confusing "undefined is not a function". Kept as a thin, separate module from the
 * registry itself so callers depend on "give me the strategy for this name" rather
 * than the registry's internal storage mechanism, which can change independently.
 */
export function selectStrategy(name: ChunkStrategyName): IChunkStrategy {
  const strategy = getChunkStrategy(name);

  if (!strategy) {
    throw new Error(`No chunk strategy registered for "${name}".`);
  }

  return strategy;
}