/**
 * Query-time embedding.
 *
 * Mirrors `src/pipeline/stages/embedding.stage.ts` exactly (same Ollama
 * model, same endpoint) because query vectors must live in the same
 * embedding space as the vectors already written to Pinecone during
 * ingestion. If ingestion's embedding model ever changes, this must change
 * with it — see `EMBEDDING_MODEL` in `lib/ai-config.ts`.
 */

import { EMBEDDING_MODEL, OLLAMA_BASE_URL } from "@/lib/ai-config";

export async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama embedding failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = await response.json();
  const vector: number[] = data.embeddings[0];

  return vector;
}