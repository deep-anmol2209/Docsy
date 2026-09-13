/**
 * Central AI and RAG configuration constants for Chaibook.
 *
 * Used by chat, embeddings, chunking, and conversation memory services.
 */

/** Default chat model when the client or workspace does not specify one. */
export const CHAT_MODEL = "openai/gpt-oss-120b";

/** Allowed chat models exposed to the client and workspace settings. */
export const CHAT_MODELS = ["openai/gpt-oss-120b"] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number];

/**
 * Validates and resolves a chat model id, falling back to {@link CHAT_MODEL}.
 *
 * @param model - Model id from client or workspace (may be null/undefined)
 * @returns A supported {@link ChatModelId}
 *
 * @example Input → Output
 * ```ts
 * resolveChatModel("gpt-4o")       // → "gpt-4o"
 * resolveChatModel("invalid")      // → "gpt-4o-mini" (default)
 * resolveChatModel(null)             // → "gpt-4o-mini"
 * ```
 */
export function resolveChatModel(model?: string | null): ChatModelId {
    if (model && CHAT_MODELS.includes(model as ChatModelId)) {
        return model as ChatModelId;
    }

    return CHAT_MODEL;
}

/**
 * Embedding model used for both ingestion (`EmbeddingStage`) and query-time
 * embedding (`query-embedder.ts`). Served locally via Ollama — NOT OpenAI.
 * These two call sites must always agree on the model, or query vectors
 * won't be comparable to what's stored in Pinecone.
 */
export const EMBEDDING_MODEL = "nomic-embed-text";

/** Vector dimension count for {@link EMBEDDING_MODEL} — must match the Pinecone index configuration. */
export const EMBEDDING_DIMENSIONS = 768;

/** Base URL of the local Ollama server used for embeddings. */
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

/** Target max characters per text chunk during source processing. */
export const CHUNK_SIZE = 400;

/** Character overlap between consecutive chunks at split boundaries. */
export const CHUNK_OVERLAP = 80;

/** Number of Pinecone chunks to retrieve per chat query. */
export const RAG_TOP_K = 3;

/**
 * Minimum cosine similarity for a *dense-only* retrieved chunk to be
 * included. Currently unused by `retrieval-service.ts`: once results are
 * fused (RRF) and reranked, the resulting scores aren't cosine
 * similarities anymore, so this threshold doesn't apply to them. Kept for
 * a potential dense-only fallback path or a future post-rerank score floor.
 */
export const RAG_MIN_SCORE = 0.35;

/** Enqueue a conversation summary job every N persisted messages. */
export const CONVERSATION_SUMMARY_INTERVAL = 8;

// --- Advanced retrieval (Phase 5) ---

/**
 * Query rewriting: LLM cleans up the raw user query into a standalone,
 * well-formed search query before embedding/searching. Skipped when the
 * query already looks well-formed (see `query-transformer.ts`), so this
 * flag is really "allowed to run", not "always runs".
 */
export const QUERY_REWRITE_ENABLED = true;

/**
 * Step-back prompting: derives a broader/more general question alongside
 * the original, to catch chunks relevant to the underlying topic that a
 * narrow query would miss. Off by default — real value depends on the
 * notebook's content and it costs an extra LLM + embedding call per turn.
 */
export const STEP_BACK_ENABLED = false;

/**
 * HyDE (Hypothetical Document Embeddings): generates a hypothetical answer
 * to the query and embeds *that* alongside the query itself, since an
 * answer-shaped passage often lands closer to real answer chunks in
 * embedding space than a short question does.
 */
export const HYDE_ENABLED = true;

/** Combine dense (Pinecone) + lexical (Postgres full-text) results via Reciprocal Rank Fusion instead of dense-only. */
export const HYBRID_RETRIEVAL_ENABLED = true;

/** Constant in the RRF formula `1 / (k + rank)` — 60 is the standard default from the original RRF paper. */
export const RRF_K = 60;

/** How many lexical (BM25-ish) candidates to pull per query, before fusion. */
export const LEXICAL_CANDIDATE_POOL = 8;

/** How many dense candidates to pull per query variant, before fusion. */
export const DENSE_CANDIDATE_POOL = 8;

/** Fused candidates kept for reranking, before cutting down to `RAG_TOP_K`. */
export const RERANK_CANDIDATE_POOL = 8;

/**
 * Reranks `RERANK_CANDIDATE_POOL` fused candidates down to `RAG_TOP_K`.
 * No dedicated cross-encoder/reranking model is configured in this
 * project, so this uses an LLM relevance-scoring pass as a substitute —
 * see `reranker.ts`. Swap in a real cross-encoder (e.g. Cohere Rerank)
 * here later without changing callers.
 */
export const RERANK_ENABLED = true;

// --- User memory (Phase 6, Mem0 hosted platform) ---

/** Max relevant memories injected into chat context per turn. */
export const MEM0_MEMORY_LIMIT = 5;

// --- Artifacts (Phase 8/9) ---

/** Chunks retrieved to ground an artifact — much broader than a single chat turn's `RAG_TOP_K`, since artifacts (e.g. "summarize this notebook") need wider coverage. */
export const ARTIFACT_RETRIEVAL_TOP_K = 24;

/** Model used for artifact generation. Separate from `CHAT_MODEL` since artifacts are longer-form and less latency-sensitive (generated in the background, not streamed). */
export const ARTIFACT_MODEL: ChatModelId = "openai/gpt-oss-120b";

/** Token budget for the notebook-context block specifically (a subset of `CONTEXT_TOKEN_BUDGET`). Enforced by trimming lowest-ranked chunks first — see `format-chunk.ts`. */
export const NOTEBOOK_CONTEXT_TOKEN_BUDGET = 3000;

/** Larger budget for artifact generation's notebook context — `ARTIFACT_MODEL` has a much bigger context window and artifacts need broader coverage. */
export const ARTIFACT_CONTEXT_TOKEN_BUDGET = 20000;

// --- Rate limiting (Phase 10) ---

/** Per-user chat message limit. See `src/utils/rate-limiter.ts` for the (in-memory, single-instance) implementation. */
export const CHAT_RATE_LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 };

/** Per-user artifact generation limit — tighter than chat since each one costs more (broader retrieval + a bigger model). */
export const ARTIFACT_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };


/** Max recent UI messages sent to the model when a rolling summary exists. */
export const RECENT_MESSAGE_WINDOW = 12;

/**
 * Rough token budget for everything the context builder assembles
 * (system instructions + summary + retrieved chunks + recent messages),
 * excluding the model's own response budget. Estimated via
 * `Math.ceil(chars / 4)` — no tokenizer dependency installed yet.
 */
export const CONTEXT_TOKEN_BUDGET = 6000;