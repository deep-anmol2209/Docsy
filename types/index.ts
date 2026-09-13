
// /**
//  * Frontend-side types mirroring the Prisma schema, hand-written rather
//  * than imported from `@/lib/generated/prisma/*` — that client is
//  * Node-only and isn't meant to ship to the browser. Dates come back as
//  * ISO strings once they've been through `NextResponse.json()`, not `Date`
//  * objects, which is the main thing these differ from the Prisma types on.
//  */

// // --- Workspace ("Notebook" in the UI) ---

// export type Workspace = {
//   id: string;
//   userId: string;
//   title: string;
//   description?: string | null;
//   icon?: string | null;
//   defaultModel?: string | null;
//   createdAt: string;
//   updatedAt: string;
//   _count?: {
//     sources: number;
//     artifacts: number;
//     conversations: number;
//   };
// };

// // --- Source ---

// export type SourceType = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";

// /** Mirrors the Prisma-level `JobState` enum exactly — 12 granular ingestion stages, in pipeline order. */
// export const JOB_STATES = [
//   "QUEUED",
//   "VALIDATING",
//   "PARSING",
//   "OCR",
//   "NORMALIZING",
//   "ANALYZING",
//   "SELECTING_STRATEGY",
//   "CHUNKING",
//   "ENRICHING",
//   "EMBEDDING",
//   "WRITING_TO_VECTOR_STORE",
//   "COMPLETED",
//   "FAILED",
// ] as const;

// export type JobStateValue = (typeof JOB_STATES)[number];

// export const TERMINAL_JOB_STATES: ReadonlySet<JobStateValue> = new Set(["COMPLETED", "FAILED"]);

// export type JobCheckpoints = {
//   parserCompleted?: boolean;
//   normalizationCompleted?: boolean;
//   analysisCompleted?: boolean;
//   chunkCompleted?: boolean;
//   embeddingCompleted?: boolean;
//   vectorCompleted?: boolean;
// };

// export type Job = {
//   id: string;
//   sourceId: string;
//   state: JobStateValue;
//   currentStage: JobStateValue;
//   retryCount: number;
//   maxRetries: number;
//   failureReason?: string | null;
//   checkpoints?: JobCheckpoints | null;
//   metrics?: Record<string, unknown> | null;
//   createdAt: string;
//   updatedAt: string;
// };

// export type Source = {
//   id: string;
//   workspaceId: string;
//   type: SourceType;
//   title: string;
//   url?: string | null;
//   content?: string | null;
//   originalReference?: string | null;
//   storageLocation?: string | null;
//   mimeType?: string | null;
//   fileSizeBytes?: number | null;
//   ingestionStatus: JobStateValue;
//   metadata?: Record<string, unknown> | null;
//   createdAt: string;
//   updatedAt: string;
//   /** Present on `getSourceForWorkspace` (single-source fetch), not on list. */
//   jobs?: Job[];
// };

// // --- Conversation / Message ---

// export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";

// export type Citation = {
//   sourceId: string;
//   chunkId: string;
//   sourceTitle: string;
//   page?: number | null;
//   heading?: string | null;
//   section?: string | null;
//   slideNumber?: number | null;
//   startTimeSeconds?: number | null;
//   endTimeSeconds?: number | null;
// };

// export type MessageContent = { text: string };

// export type Message = {
//   id: string;
//   conversationId: string;
//   role: MessageRole;
//   content: MessageContent;
//   citations?: Citation[] | null;
//   metadata?: Record<string, unknown> | null;
//   model?: string | null;
//   tokenUsage?: Record<string, unknown> | null;
//   createdAt: string;
// };

// export type Conversation = {
//   id: string;
//   workspaceId: string;
//   title?: string | null;
//   summary?: string | null;
//   summaryMessageCount: number;
//   summarizedAt?: string | null;
//   model?: string | null;
//   metadata?: MessageMetadata;
//   createdAt: string;
//   updatedAt: string;
// };

// // --- Artifact ---

// export type ArtifactType =
//   | "SUMMARY"
//   | "STUDY_GUIDE"
//   | "FAQ"
//   | "TIMELINE"
//   | "QUIZ"
//   | "FLASHCARDS"
//   | "NOTES"
//   | "MIND_MAP"
//   | "TABLE"
//   | "CUSTOM";

// export type ArtifactStatus = "GENERATING" | "READY" | "FAILED" | "ARCHIVED";

// export type ArtifactSourceRef = {
//   sourceId: string;
//   source: { id: string; title: string };
// };

// export type Artifact = {
//   id: string;
//   workspaceId: string;
//   title: string;
//   description?: string | null;
//   type: ArtifactType;
//   status: ArtifactStatus;
//   content?: string | null;
//   metadata?: Record<string, unknown> | null;
//   generationPrompt?: string | null;
//   modelUsed?: string | null;
//   modelVersion?: string | null;
//   tokenUsage?: Record<string, unknown> | null;
//   version: number;
//   isPinned: boolean;
//   isDeleted: boolean;
//   createdAt: string;
//   updatedAt: string;
//   /** Present on `getArtifactForWorkspace` (single fetch), not on list. */
//   sources?: ArtifactSourceRef[];
// };

// /** Intent returned alongside a `202` chat response when a message was routed to artifact generation instead of a normal reply. */
// export type ChatIntent =
//   | "CHAT"
//   | "CREATE_SUMMARY"
//   | "CREATE_STUDY_GUIDE"
//   | "CREATE_FAQ"
//   | "CREATE_TIMELINE"
//   | "CREATE_QUIZ"
//   | "CREATE_FLASHCARDS"
//   | "CREATE_NOTES"
//   | "CREATE_MIND_MAP"
//   | "CREATE_TABLE"
//   | "CUSTOM_ARTIFACT";


//   export type MessageMetadata = Record<string, unknown> | null;

/**
 * Frontend-side types mirroring the Prisma schema, hand-written rather
 * than imported from `@/lib/generated/prisma/*` — that client is
 * Node-only and isn't meant to ship to the browser. Dates come back as
 * ISO strings once they've been through `NextResponse.json()`, not `Date`
 * objects, which is the main thing these differ from the Prisma types on.
 */

// --- Workspace ("Notebook" in the UI) ---

export type Workspace = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  defaultModel?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sources: number;
    artifacts: number;
    conversations: number;
  };
};

// --- Source ---

export type SourceType = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";

/** Mirrors the Prisma-level `JobState` enum exactly — 12 granular ingestion stages, in pipeline order. */
export const JOB_STATES = [
  "QUEUED",
  "VALIDATING",
  "PARSING",
  "OCR",
  "NORMALIZING",
  "ANALYZING",
  "SELECTING_STRATEGY",
  "CHUNKING",
  "ENRICHING",
  "EMBEDDING",
  "WRITING_TO_VECTOR_STORE",
  "COMPLETED",
  "FAILED",
] as const;

export type JobStateValue = (typeof JOB_STATES)[number];

export const TERMINAL_JOB_STATES: ReadonlySet<JobStateValue> = new Set(["COMPLETED", "FAILED"]);

export type JobCheckpoints = {
  parserCompleted?: boolean;
  normalizationCompleted?: boolean;
  analysisCompleted?: boolean;
  chunkCompleted?: boolean;
  embeddingCompleted?: boolean;
  vectorCompleted?: boolean;
};

export type Job = {
  id: string;
  sourceId: string;
  state: JobStateValue;
  currentStage: JobStateValue;
  retryCount: number;
  maxRetries: number;
  failureReason?: string | null;
  checkpoints?: JobCheckpoints | null;
  metrics?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type Source = {
  id: string;
  workspaceId: string;
  type: SourceType;
  title: string;
  url?: string | null;
  content?: string | null;
  originalReference?: string | null;
  storageLocation?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  ingestionStatus: JobStateValue;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  /** Present on `getSourceForWorkspace` (single-source fetch), not on list. */
  jobs?: Job[];
};

// --- Conversation / Message ---

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";

export type Citation = {
  sourceId: string;
  chunkId: string;
  sourceTitle: string;
  page?: number | null;
  heading?: string | null;
  section?: string | null;
  slideNumber?: number | null;
  startTimeSeconds?: number | null;
  endTimeSeconds?: number | null;
};

export type MessageContent = { text: string };

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: MessageContent;
  citations?: Citation[] | null;
  metadata?: Record<string, unknown> | null;
  model?: string | null;
  tokenUsage?: Record<string, unknown> | null;
  createdAt: string;
};

export type Conversation = {
  id: string;
  workspaceId: string;
  title?: string | null;
  summary?: string | null;
  summaryMessageCount: number;
  summarizedAt?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

// --- Artifact ---

export type ArtifactType =
  | "SUMMARY"
  | "STUDY_GUIDE"
  | "FAQ"
  | "TIMELINE"
  | "QUIZ"
  | "FLASHCARDS"
  | "NOTES"
  | "MIND_MAP"
  | "TABLE"
  | "CUSTOM";

export type ArtifactStatus = "GENERATING" | "READY" | "FAILED" | "ARCHIVED";

export type ArtifactSourceRef = {
  sourceId: string;
  source: { id: string; title: string };
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  sourceRefs?: string[];
};

export type FAQData = {
  items: FAQItem[];
};

export type Artifact = {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  type: ArtifactType;
  status: ArtifactStatus;
  content?: string | null;
  metadata?: ArtifactMetadata | null;
  generationPrompt?: string | null;
  modelUsed?: string | null;
  modelVersion?: string | null;
  tokenUsage?: Record<string, unknown> | null;
  version: number;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on `getArtifactForWorkspace` (single fetch), not on list. */
  sources?: ArtifactSourceRef[];
};
export type ArtifactMetadata = {
  artifactData?: StructuredArtifactEnvelopeByType;
  sourceCount?: number;
  conversationId?: string;
  [key: string]: unknown;
};
// --- Structured artifact data (FLASHCARDS / QUIZ / MIND_MAP / TABLE only) ---
//
// Mirrors `src/services/artifact/schemas/*.ts` on the backend (Zod is the
// actual source of truth there — these are hand-written to match, same
// convention as every other type in this file). Present at
// `artifact.metadata.artifactData` only for these four types; every other
// type (SUMMARY, STUDY_GUIDE, FAQ, TIMELINE, NOTES, CUSTOM) has none and
// continues to render from `artifact.content` as Markdown.

export type StructuredArtifactType = "FLASHCARDS" | "QUIZ" | "MIND_MAP" | "TABLE" | "FAQ";

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  sourceRefs?: string[];
};

export type FlashcardsData = {
  cards: Flashcard[];
};

export type QuizOption = {
  id: string;
  text: string;
};



export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
  sourceRefs?: string[];
};

export type QuizData = {
  questions: QuizQuestion[];
};

export type MindMapNode = {
  id: string;
  label: string;
  children?: MindMapNode[];
};

export type MindMapData = {
  root: MindMapNode;
};

export type TableColumn = {
  id: string;
  label: string;
};

export type TableData = {
  columns: TableColumn[];
  rows: Record<string, string>[];
};

export type TimelineItem = {
  id: string;
  date?: string;
  title: string;
  description: string;
  sourceRefs?: string[];
};

export type TimelineData = {
  events: TimelineItem[];
};

export type StructuredDataByType = {
  FLASHCARDS: FlashcardsData;
  QUIZ: QuizData;
  MIND_MAP: MindMapData;
  TABLE: TableData;
  FAQ: FAQData
};

export type StructuredArtifactEnvelopeByType = {
  [T in StructuredArtifactType]: {
    schemaVersion: number;
    type: T;
    title: string;
    data: StructuredDataByType[T];
  };
}[StructuredArtifactType];
/** Intent returned alongside a `202` chat response when a message was routed to artifact generation instead of a normal reply. */
export type ChatIntent =
  | "CHAT"
  | "CREATE_SUMMARY"
  | "CREATE_STUDY_GUIDE"
  | "CREATE_FAQ"
  | "CREATE_TIMELINE"
  | "CREATE_QUIZ"
  | "CREATE_FLASHCARDS"
  | "CREATE_NOTES"
  | "CREATE_MIND_MAP"
  | "CREATE_TABLE"
  | "CUSTOM_ARTIFACT";