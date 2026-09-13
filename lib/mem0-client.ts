/**
 * Mem0 hosted platform client singleton.
 *
 * `MemoryClient` talks to Mem0's cloud API (app.mem0.ai), not a
 * self-hosted instance — no vector store / LLM config lives here, that's
 * managed on Mem0's side. Requires `MEM0_API_KEY`.
 *
 * `getMem0Client()` returns `null` when unset so the memory service can
 * degrade gracefully (chat works fine with zero user memory) rather than
 * throwing.
 */

import { MemoryClient } from "mem0ai";

const globalForMem0 = globalThis as unknown as {
  mem0: MemoryClient | undefined;
};

export function getMem0Client(): MemoryClient | null {
  const apiKey = process.env.MEM0_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!globalForMem0.mem0) {
    globalForMem0.mem0 = new MemoryClient({ apiKey });
  }

  return globalForMem0.mem0;
}