/**
 * Chat intent and query-route detection. Query routing uses a small LLM call
 * for natural language understanding and falls back to deterministic rules
 * when the router is unavailable.
 */

import type { Message } from "@/lib/generated/prisma/client";
import { getChatClient } from "@/lib/openai";
import { CHAT_MODEL } from "@/lib/ai-config";
import { ArtifactType } from "@/lib/generated/prisma/enums";
import { extractMessageText } from "@/src/utils/message-content";
import { logger } from "@/src/utils/logger";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
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

export type QueryRoute =
  | "GENERAL"
  | "CONVERSATIONAL"
  | "NOTEBOOK"
  | "AMBIGUOUS"
  | "ARTIFACT";

export interface NotebookSourceMetadata {
  id?: string;
  title: string;
  type?: string;
  description?: string;
}

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
  /^(?:hi|hello|hey|hey there|good morning|good afternoon|good evening|yo|sup|namaste|hola|bonjour|greetings|salutations)(?:\s+(?:bro|dude|man|mate|there|all|everyone|docsy|bot|assistant))?[.!\s]*$/i;

const ACKNOWLEDGEMENT_PATTERN =
  /^(?:thanks?|thank you(?: so much)?|thx|ty|ok|okay|k|cool|nice|oh nice|awesome|great|got it|understood|sounds good|perfect|alright|all right|all good|sure|no problem|no worries|nevermind|never mind|goodbye|bye|see you|cya)(?:\s+(?:bro|dude|man|mate|buddy|pal|friend))?(?:\s+for (?:asking|helping|the help|everything))?[.!\s]*$/i;

const CASUAL_CLOSURE_PATTERN =
  /^(?:no|nah|nope)(?:\s+(?:bro|dude|man|mate|buddy|pal|friend))?(?:,?\s*(?:thanks?|thank you|thanks for asking|all good|that'?s (?:all|fine|it)|i'?m good|no worries))?[.!\s]*$/i;

const GENERAL_ASSISTANT_PATTERN =
  /^(?:who are you|what are you|what can you do|how do you work|how can you help|are you there|can you help me|what do you do|tell me a joke\b.*|write (?:a|an) (?:python|javascript|typescript|sql) (?:function|script|program|snippet|code)\b.*)\s*[?!.]*$/i;

const CONVERSATIONAL_QUERY_PATTERN =
  /^(?:what (?:are|were) we talking about(?:\s+(?:last|earlier|just now|before))?|what were we discussing(?:\s+(?:last|earlier|just now|before))?|what did (?:you|we) say(?:\s+(?:last|earlier|just now|before))?|what was the (?:previous|last) topic|what was discussed(?:\s+(?:last|earlier|just now|before))?|what did we talk about(?:\s+(?:last|earlier|just now|before))?)\s*[?!.]*$/i;

const AMBIGUOUS_REFERENCE_PATTERN =
  /\b(this|that|it|these|those|above|from this|from that|based on this|based on that|on this|on that)\b/i;

const QUERY_ROUTER_SYSTEM_PROMPT = `You are a query classifier for an AI notebook assistant.
You are operating INSIDE a notebook that has specific reference sources (documents, notes, books, transcripts, etc.).

Classify the user's latest message into exactly one route:

GENERAL:
- Greetings (e.g. "hi", "hello bro", "hey there")
- Casual acknowledgements, thanks, polite closures (e.g. "thanks bro", "thank you so much", "no bro thanks for asking", "cool", "oh nice", "got it", "ok", "sounds good")
- Casual small talk and banter
- Assistant identity/capability questions ("who are you?", "what can you do?")
- General programming help or questions completely unrelated to the notebook sources
- Jokes or clearly off-topic remarks

CONVERSATIONAL:
- Questions about previous conversation messages or history (e.g. "what were we talking about?", "what did you say earlier?", "what was the previous topic?", "what did we discuss?")

NOTEBOOK:
- Questions or requests asking for factual information, concepts, explanations, or details that could reasonably be answered by or related to the available notebook sources
- Normal factual questions (e.g. "Who is Abdul Kalam?", "How to become a backend engineer?", "What is caching?") should PREFER NOTEBOOK when inside a notebook, especially when an available source appears relevant
- Do NOT require the user to explicitly say "according to my sources", "from the notebook", etc.
- A question being answerable from general world knowledge does NOT make it GENERAL. If it could reasonably be answered from an available notebook source, classify it as NOTEBOOK so the retrieval engine can search the notebook.

AMBIGUOUS:
- Requests containing pronouns or references such as "this", "that", "it", "these", "those", "above" (e.g. "explain this simply", "summarize that", "tell me more about it") where understanding the subject requires previous conversation history or grounded context

ARTIFACT:
- Requests to create or generate a quiz, flashcards, summary, study guide, FAQ, timeline, notes, mind map, table, or report

Return only valid JSON in this exact shape: {"route":"GENERAL|CONVERSATIONAL|NOTEBOOK|AMBIGUOUS|ARTIFACT"}`;

function deterministicRoute(
  message: string,
  notebookSources?: NotebookSourceMetadata[],
): QueryRoute {
  const trimmed = message.trim();

  if (!trimmed) return "GENERAL";
  if (detectIntent(trimmed) !== "CHAT") return "ARTIFACT";
  if (isGeneralAssistantQuery(trimmed)) return "GENERAL";
  if (CONVERSATIONAL_QUERY_PATTERN.test(trimmed)) return "CONVERSATIONAL";
  if (AMBIGUOUS_REFERENCE_PATTERN.test(trimmed)) return "AMBIGUOUS";

  return "NOTEBOOK";
}

function parseQueryRoute(value: string | null): QueryRoute | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { route?: unknown };
    return typeof parsed.route === "string" &&
      ["GENERAL", "CONVERSATIONAL", "NOTEBOOK", "AMBIGUOUS", "ARTIFACT"].includes(parsed.route)
      ? parsed.route as QueryRoute
      : null;
  } catch {
    const route = value.match(/\b(GENERAL|CONVERSATIONAL|NOTEBOOK|AMBIGUOUS|ARTIFACT)\b/)?.[1];
    return route ? route as QueryRoute : null;
  }
}

export function isGeneralAssistantQuery(message: string): boolean {
  const trimmed = message.trim();

  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.replace(/\s+/g, " ").toLowerCase();

  return (
    GREETING_PATTERN.test(normalized) ||
    ACKNOWLEDGEMENT_PATTERN.test(normalized) ||
    CASUAL_CLOSURE_PATTERN.test(normalized) ||
    GENERAL_ASSISTANT_PATTERN.test(normalized)
  );
}

/**
 * Routes normal chat before notebook retrieval. Explicit artifact requests
 * are still handled separately by `detectIntent` at the controller boundary.
 */
// export async function routeQuery(params: {
//   message: string;
//   recentMessages?: Message[];
//   notebookSources?: NotebookSourceMetadata[];
// }): Promise<QueryRoute> {
//   const fallback = deterministicRoute(params.message, params.notebookSources);
//   const history = (params.recentMessages ?? [])
//     .slice(-6)
//     .map((message) => `${message.role}: ${extractMessageText(message.content)}`)
//     .join("\n");

//   const sourcesList = (params.notebookSources ?? [])
//     .map((source) => `- ${source.title}${source.type ? ` [${source.type}]` : ""}`)
//     .join("\n");
//   const sourcesText = sourcesList.trim() ? sourcesList : "(no sources uploaded yet)";

//   try {
//     const client = getChatClient("groq");
//     const completion = await client.chat.completions.create({
//       model: CHAT_MODEL,
//       temperature: 0,
//       max_tokens: 100,
//       messages: [
//         { role: "system", content: QUERY_ROUTER_SYSTEM_PROMPT },
//         {
//           role: "user",
//           content: `Available notebook sources:\n${sourcesText}\n\nConversation context:\n${history || "(none)"}\n\nLatest user message:\n${params.message}`,
//         },
//       ],
//     });

//     const rawRoute = completion.choices[0]?.message?.content ?? null;
//     const parsedRoute = parseQueryRoute(rawRoute);

//     console.log("\n========== LLM QUERY ROUTER ==========");
//     console.log("Latest message:", params.message);
//     console.log(
//       "Notebook source titles:",
//       (params.notebookSources ?? []).map((s) => s.title),
//     );
//     console.log("Conversation history:", history || "(none)");
//     console.log("LLM raw response:", rawRoute);
//     console.log("Parsed route:", parsedRoute);
//     console.log("Deterministic fallback:", fallback);
//     console.log("======================================\n");

//     return parsedRoute ?? fallback;
//   } catch (error) {
//     logger.warn("Query router LLM call failed; using deterministic fallback", error);
//     console.log("\n========== LLM QUERY ROUTER (FALLBACK) ==========");
//     console.log("Latest message:", params.message);
//     console.log(
//       "Notebook source titles:",
//       (params.notebookSources ?? []).map((s) => s.title),
//     );
//     console.log("Conversation history:", history || "(none)");
//     console.log("Deterministic fallback:", fallback);
//     console.log("=================================================\n");
//     return fallback;
//   }
// }

export async function routeQuery(params: {
  message: string;
  recentMessages?: Message[];
  notebookSources?: NotebookSourceMetadata[];
}): Promise<QueryRoute> {
  const fallback = deterministicRoute(
    params.message,
    params.notebookSources,
  );
const jevClient= new TypeSafeClient({
  apiKey: process.env.JEV_API_KEY!
})
  const history = (params.recentMessages ?? [])
    .slice(-6)
    .map(
      (message) =>
        `${message.role}: ${extractMessageText(message.content)}`,
    )
    .join("\n");

  const sourcesList = (params.notebookSources ?? [])
    .map(
      (source) =>
        `- ${source.title}${source.type ? ` [${source.type}]` : ""}`,
    )
    .join("\n");

  const sourcesText = sourcesList.trim()
    ? sourcesList
    : "(no sources uploaded yet)";

  try {
    const response = await jevClient.systemOne({
      state: {
        availableNotebookSources: sourcesText,
        conversationHistory: history || "(none)",
        latestUserMessage: params.message,
      },

      questions: {
        route: choice(
          `Classify the user's latest message into exactly one route.

GENERAL:
- Greetings
- Thanks, acknowledgements, polite closures
- Casual small talk
- Assistant identity/capability questions
- General programming/help unrelated to notebook sources
- Jokes or clearly off-topic remarks

CONVERSATIONAL:
- Questions about previous conversation messages or history
- Examples: "what were we talking about?", "what did you say earlier?"

NOTEBOOK:
- Questions asking for factual information, concepts, explanations, or details
  that could reasonably be answered by the available notebook sources.
- Inside a notebook, normal factual questions should prefer NOTEBOOK when
  an available source could contain the answer.

AMBIGUOUS:
- Requests containing references such as "this", "that", "it", "these",
  "those", "above", when understanding the subject requires previous
  conversation or grounded context.

ARTIFACT:
- Requests to create or generate a quiz, flashcards, summary, study guide,
  FAQ, timeline, notes, mind map, table, report, or other artifact.`,
          {
            GENERAL: null,
            CONVERSATIONAL: null,
            NOTEBOOK: null,
            AMBIGUOUS: null,
            ARTIFACT: null,
          },
        ),
      },
    });

    const result = response.answers.route;

    console.log("\n========== JEV QUERY ROUTER ==========");
    console.log("Latest message:", params.message);
    console.log(
      "Notebook source titles:",
      (params.notebookSources ?? []).map((s) => s.title),
    );
    console.log("Conversation history:", history || "(none)");
    console.log("Jev route:", result.choice);
    console.log("Jev confidence:", result.confidence);
    console.log("Jev probabilities:", result.probabilities);
    console.log("Deterministic fallback:", fallback);
    console.log("======================================\n");

    return result.choice as QueryRoute;
  } catch (error) {
    logger.warn(
      "Jev query router call failed; using deterministic fallback",
      error,
    );

    console.log(
      "\n========== JEV QUERY ROUTER (FALLBACK) ==========",
    );
    console.log("Latest message:", params.message);
    console.log("Deterministic fallback:", fallback);
    console.log("=================================================\n");

    return fallback;
  }
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
  console.log("detecting intent for message:", trimmed);
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