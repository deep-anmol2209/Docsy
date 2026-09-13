
// /**
//  * OpenAI client singleton, used for chat generation only.
//  *
//  * Embeddings are NOT generated with this client — ingestion and query-time
//  * embedding both use the local Ollama model (see
//  * `src/services/retrieval/query-embedder.ts`), so the vector space stays
//  * consistent between what was written to Pinecone and what's queried.
//  *
//  * Requires `OPENAI_API_KEY`.
//  */

// import OpenAI from "openai";

// const globalForOpenAI = globalThis as unknown as {
//   openai: OpenAI | undefined;
// };

// function createOpenAIClient(): OpenAI {
//   const apiKey = process.env.OPENAI_API_KEY;

//   if (!apiKey) {
//     throw new Error("OPENAI_API_KEY is not defined");
//   }

//   return new OpenAI({ apiKey });
// }

// export const openai = globalForOpenAI.openai ?? createOpenAIClient();

// if (process.env.NODE_ENV !== "production") {
//   globalForOpenAI.openai = openai;
// }






/**
 * Chat-generation clients — OpenAI, Groq, and Gemini.
 *
 * Groq and Gemini both expose an OpenAI-compatible `/chat/completions`
 * endpoint, so no separate `groq-sdk` / `@google/genai` package is
 * needed — every provider here is just the `openai` package pointed at a
 * different `baseURL` + API key. Call sites that already do
 * `openai.chat.completions.create(...)` work unchanged against any of
 * these three.
 *
 * Embeddings are NOT generated with any of these — ingestion and
 * query-time embedding both use the local Ollama model (see
 * `src/services/retrieval/query-embedder.ts`), so the vector space stays
 * consistent between what was written to Pinecone and what's queried.
 */

import OpenAI from "openai";

export type ChatProvider = "openai" | "groq" | "gemini";

const globalForAIClients = globalThis as unknown as {
  openai?: OpenAI;
  groq?: OpenAI;
  gemini?: OpenAI;
};

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not defined");
  }

  return new OpenAI({ apiKey });
}

/** Required — this is the default provider, so it's created eagerly like before. */
export const openai = globalForAIClients.openai ?? createOpenAIClient();

if (process.env.NODE_ENV !== "production") {
  globalForAIClients.openai = openai;
}

/**
 * Groq — OpenAI-compatible endpoint (`api.groq.com/openai/v1`).
 * Optional: returns `null` if `GROQ_API_KEY` isn't set, so the app still
 * runs fine for anyone not using Groq.
 */
export function getGroqClient(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!globalForAIClients.groq) {
    globalForAIClients.groq = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  return globalForAIClients.groq;
}

/**
 * Gemini — OpenAI-compatible endpoint
 * (`generativelanguage.googleapis.com/v1beta/openai/`).
 * Optional: returns `null` if `GEMINI_API_KEY` isn't set.
 */
export function getGeminiClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!globalForAIClients.gemini) {
    globalForAIClients.gemini = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return globalForAIClients.gemini;
}

/**
 * Resolves a provider name to its client. Throws a clear, actionable
 * error immediately (rather than letting an unconfigured client fail
 * later with an opaque 401) if that provider's API key isn't set.
 *
 * Usage:
 *   const client = getChatClient("groq");
 *   await client.chat.completions.create({ model: "llama-3.3-70b-versatile", messages, stream: true });
 */
export function getChatClient(provider: ChatProvider): OpenAI {
  switch (provider) {
    case "openai":
      return openai;
    case "groq": {
      const client = getGroqClient();
      if (!client) throw new Error("GROQ_API_KEY is not defined");
      return client;
    }
    case "gemini": {
      const client = getGeminiClient();
      if (!client) throw new Error("GEMINI_API_KEY is not defined");
      return client;
    }
  }
}