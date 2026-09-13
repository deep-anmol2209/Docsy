/**
 * Artifact intent detection (Phase 8) — deterministic and free (no LLM
 * call), since the spec explicitly asks not to spend a model call
 * classifying intent when rules can do it. Trade-off: this favors
 * precision over recall — an ambiguous message defaults to CHAT rather
 * than risking an unwanted artifact generation job.
 */

import { ArtifactType } from "@/lib/generated/prisma/enums";

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

const ARTIFACT_TYPE_BY_INTENT: Record<Exclude<ChatIntent, "CHAT">, ArtifactType> = {
  CREATE_SUMMARY: ArtifactType.SUMMARY,
  CREATE_STUDY_GUIDE: ArtifactType.STUDY_GUIDE,
  CREATE_FAQ: ArtifactType.FAQ,
  CREATE_TIMELINE: ArtifactType.TIMELINE,
  CREATE_QUIZ: ArtifactType.QUIZ,
  CREATE_FLASHCARDS: ArtifactType.FLASHCARDS,
  CREATE_NOTES: ArtifactType.NOTES,
  CREATE_MIND_MAP: ArtifactType.MIND_MAP,
  CREATE_TABLE: ArtifactType.TABLE,
  CUSTOM_ARTIFACT: ArtifactType.CUSTOM,
};

const ACTION_VERB_PATTERN =
  /\b(create|make|generate|build|write|draft|prepare|give me|produce|put together|whip up|turn (this|these|it) into)\b/i;

const QUESTION_SHAPED_PATTERN =
  /\?\s*$/;
const QUESTION_LEADING_PATTERN =
  /^(what|why|how|when|where|who|which|is|are|does|do|can|could|should|explain|tell me about)\b/i;

/** Ordered by specificity — more specific artifact nouns checked first (e.g. "study guide" before generic "guide"). */
const ARTIFACT_RULES: Array<{ intent: ChatIntent; pattern: RegExp }> = [
  { intent: "CREATE_FLASHCARDS", pattern: /\bflash ?cards?\b/i },
  { intent: "CREATE_STUDY_GUIDE", pattern: /\bstudy guide\b/i },
  { intent: "CREATE_FAQ", pattern: /\b(faq|frequently asked questions)\b/i },
  { intent: "CREATE_TIMELINE", pattern: /\btimeline\b/i },
  { intent: "CREATE_QUIZ", pattern: /\b(quiz|practice questions|test me)\b/i },
  { intent: "CREATE_MIND_MAP", pattern: /\bmind ?map\b/i },
  { intent: "CREATE_TABLE", pattern: /\b(table|comparison chart|spreadsheet)\b/i },
  { intent: "CREATE_NOTES", pattern: /\b(notes|cheat sheet)\b/i },
  { intent: "CREATE_SUMMARY", pattern: /\bsummar(y|ize|ise|ies)\b/i },
];

const GENERIC_ARTIFACT_PATTERN =
  /\b(artifact|document|report|deck|worksheet|outline|study plan|handout)\b/i;

const GREETING_PATTERN =
  /^(hi|hello|hey|hey there|good morning|good afternoon|good evening|yo|sup|namaste|hola|bonjour|greetings|salutations)\b/i;

const GENERAL_ASSISTANT_PATTERN =
  /\b(who are you|what are you|what can you do|how do you work|how can you help|are you there|can you help me|what do you do)\b/i;

const NOTEBOOK_REFERENCE_PATTERN =
  /\b(notebook|source|pdf|document|file|notes?|slides?|lecture|presentation|transcript|page|chapter|report|article|paper|section|summary|context|upload|uploaded|this file|my file|this notebook|my notes|my source)\b/i;

export function isGeneralAssistantQuery(message: string): boolean {
  const trimmed = message.trim();

  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();

  if (GREETING_PATTERN.test(normalized) || GENERAL_ASSISTANT_PATTERN.test(normalized)) {
    return true;
  }

  const isQuestion = /^(what|why|how|when|where|who|which|can|could|should|would|is|are|do|does)\b/i.test(trimmed);
  const hasNotebookReference = NOTEBOOK_REFERENCE_PATTERN.test(normalized);
  const hasCreationVerb = /\b(create|make|generate|build|write|draft|summarize|summarise|explain|compare|analyze|analyse|describe|list|find)\b/i.test(trimmed);

  if (isQuestion && !hasNotebookReference && !hasCreationVerb) {
    return true;
  }

  return false;
}

/**
 * Classifies a chat message as either normal `CHAT` or a request to
 * generate a specific artifact type.
 *
 * Guards against the obvious false positive: a *question about* an
 * artifact-shaped noun ("what is a mind map?") is CHAT, not a request to
 * create one — a question needs an explicit creation verb to count.
 */
export function detectIntent(message: string): ChatIntent {
  const trimmed = message.trim();

  if (!trimmed) {
    return "CHAT";
  }

  const hasActionVerb = ACTION_VERB_PATTERN.test(trimmed);
  const isQuestionShaped =
    QUESTION_SHAPED_PATTERN.test(trimmed) || QUESTION_LEADING_PATTERN.test(trimmed);

  if (isQuestionShaped && !hasActionVerb) {
    return "CHAT";
  }

  for (const rule of ARTIFACT_RULES) {
    if (rule.pattern.test(trimmed) && (hasActionVerb || !isQuestionShaped)) {
      return rule.intent;
    }
  }

  if (hasActionVerb && GENERIC_ARTIFACT_PATTERN.test(trimmed)) {
    return "CUSTOM_ARTIFACT";
  }

  return "CHAT";
}

export function artifactTypeForIntent(intent: ChatIntent): ArtifactType | null {
  if (intent === "CHAT") {
    return null;
  }

  return ARTIFACT_TYPE_BY_INTENT[intent];
}