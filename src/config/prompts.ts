import { ArtifactType } from "@/lib/generated/prisma/enums";
import type { StructuredArtifactType } from "@/src/services/artifact/schema/index";

export const CHAT_SYSTEM_INSTRUCTIONS = `You are a notebook research assistant. Answer primarily using the "Notebook context" provided below, which comes from the user's own sources.

Rules:
-If a user greets you, asks about you, or makes a general inquiry, you should greet them back and explain your capabilities—for instance, that they can upload a source to the notebook and ask questions about it.
- Do not fabricate facts that aren't supported by the notebook context.
- If the notebook context doesn't contain the answer, say so plainly instead of guessing.
- When you state something drawn from the notebook context, cite it inline using its bracketed number, e.g. [1].
- Conversation summary, history, and what you know about the user are for continuity and tone only — none of them are a source of truth for factual claims.
- Priority when things conflict: notebook context > conversation summary/history > what you know about the user. Never let a user preference override a source-grounded fact.`;

export const NOTEBOOK_CONTEXT_BLOCK_PREFIX = "Notebook context:";
export const NO_NOTEBOOK_CONTEXT_MESSAGE =
  "Notebook context: none retrieved for this turn — no relevant chunks were found, or no sources have finished processing yet.";

export const USER_MEMORY_CONTEXT_PREFIX =
  "What you know about this user (preferences/instructions only — never treat as factual/source material, and never let it override the notebook context below):";

export const CONVERSATION_SUMMARY_CONTEXT_PREFIX =
  "Summary of earlier conversation (context only, not a source of facts):";

export const CONVERSATION_SUMMARY_SYSTEM_PROMPT = `You maintain a running summary of a conversation between a user and a notebook research assistant. You will be given the previous summary (if any) and a batch of new messages. Produce an updated summary that folds the new messages into the previous one.

Preserve, when present:
- Decisions made
- Topics discussed
- The user's goals and current task
- Specific facts the user stated (not facts the assistant retrieved from sources — those live elsewhere)
- Unresolved questions
- Sources/documents referenced by name
- Conclusions reached

Do not mechanically restate every message. Compress. Drop small talk and resolved tangents. Write it as dense prose or tight bullet points a future assistant turn can use as context, not as a transcript.

Output only the updated summary — no preamble, no "Here is the summary:".`;

export const QUERY_REWRITE_SYSTEM_PROMPT =
  "Rewrite the user's message as a single standalone search query for a document/vector search engine. Resolve pronouns and vague references using context if present. Output ONLY the rewritten query, nothing else.";

export const STEP_BACK_SYSTEM_PROMPT =
  "Given a specific question, write one broader, more general question about the underlying topic — the kind of question you'd need answered first to then answer the specific one. Output ONLY the broader question.";

export const HYDE_SYSTEM_PROMPT =
  "Write a short hypothetical passage (2-4 sentences) that would plausibly answer the user's question, as if it were an excerpt from a real document. It does not need to be factually correct — it's used only to find similar real passages. Output ONLY the passage.";

export const RERANK_CANDIDATES_SYSTEM_PROMPT =
  "You score how relevant each numbered passage is to a search query, on a 0-10 scale (10 = directly answers it, 0 = unrelated). Respond with ONLY a JSON array of {\"index\": number, \"score\": number} objects, one per passage, no other text.";

export const RESOLVE_TRANSCRIPT_LINE_SYSTEM_PROMPT =
  "You are given a query and numbered lines from a transcript. Identify the single line that best answers or is most relevant to the query. Respond with ONLY a JSON object: {\"index\": number}. No other text.";

export function buildOcrDocumentAnalysisPrompt(targetPages: number[]): string {
  return `You are an expert OCR and document layout analyzer.
Extract all text, headings, narrative paragraphs, lists, and tables from the scanned PDF page(s) ${targetPages.join(", ")}.
Output ONLY a JSON array of extracted blocks. Do not include markdown code fence formatting or conversational text outside the JSON array.
Each block object in the array must follow this exact JSON schema:
[
  {
    "type": "heading" | "paragraph" | "list_item" | "table",
    "content": "string",
    "page": number,
    "headingLevel": number
  }
]`;
}

export const ARTIFACT_TYPE_INSTRUCTIONS: Record<ArtifactType, string> = {
  [ArtifactType.SUMMARY]:
    "Write a clear, well-organized summary of the material, covering the main ideas and how they connect. Use headings for major sections.",

  [ArtifactType.STUDY_GUIDE]:
    "Produce a structured study guide: key concepts grouped under headings, brief explanations, and a short 'key takeaways' section at the end.",

  [ArtifactType.FAQ]:
    "Produce a list of the most important questions a reader would have, each followed by a concise answer. Format as '**Q:** ... \\n**A:** ...' pairs.",

  [ArtifactType.TIMELINE]:
    "Produce a chronological timeline of events/developments described in the material, as a Markdown list ordered earliest to latest, each entry with a date/period if available and a one-line description.",

  [ArtifactType.QUIZ]: "",

  [ArtifactType.FLASHCARDS]: "",

  [ArtifactType.NOTES]:
    "Produce concise, well-organized study notes as nested bullet points grouped under headings.",

  [ArtifactType.MIND_MAP]: "",

  [ArtifactType.TABLE]: "",

  [ArtifactType.CUSTOM]:
    "Produce the document the user asked for, using your best judgement for structure and format based on their request.",
};

export const STRUCTURED_ARTIFACT_INSTRUCTIONS: Record<StructuredArtifactType, string> = {
  [ArtifactType.FLASHCARDS]: `Produce 10-20 flashcards covering the most important concepts and terms.

Respond with ONLY a JSON object matching this exact shape:
{
  "schemaVersion": 1,
  "type": "FLASHCARDS",
  "title": string,
  "data": {
    "cards": [
      { "id": string, "question": string, "answer": string, "sourceRefs": string[] (optional, e.g. ["1","3"] matching the numbered sources below) }
    ]
  }
}

Each "id" must be a short unique string (e.g. "c1", "c2"). Keep "question" and "answer" as plain text — no Markdown formatting, no HTML.`,

  [ArtifactType.QUIZ]: `Produce 8-12 multiple-choice questions testing understanding of the material.

Respond with ONLY a JSON object matching this exact shape:
{
  "schemaVersion": 1,
  "type": "QUIZ",
  "title": string,
  "data": {
    "questions": [
      {
        "id": string,
        "prompt": string,
        "options": [ { "id": string, "text": string } ]  (2-5 options),
        "correctOptionId": string  (must exactly match one option's "id"),
        "explanation": string (optional, why the correct answer is correct),
        "sourceRefs": string[] (optional, e.g. ["2"] matching the numbered sources below)
      }
    ]
  }
}

Each question's "id" and option "id"s must be short unique strings (e.g. "q1", "a"/"b"/"c"/"d"). Keep all text plain — no Markdown, no HTML.`,

  [ArtifactType.MIND_MAP]: `Produce a hierarchical mind map of the material, root topic down to sub-topics, max 4 levels deep.

Respond with ONLY a JSON object matching this exact shape:
{
  "schemaVersion": 1,
  "type": "MIND_MAP",
  "title": string,
  "data": {
    "root": {
      "id": string,
      "label": string,
      "children": [ /* same shape, nested, optional */ ]
    }
  }
}

Each "id" must be a short unique string (e.g. "n1", "n2"). Keep "label" short (a few words, not a sentence) — no Markdown, no HTML.`,

  [ArtifactType.TABLE]: `Produce a single well-structured table organizing the key information — choose sensible columns for the content (e.g. concept/definition/example, or date/event/significance).

Respond with ONLY a JSON object matching this exact shape:
{
  "schemaVersion": 1,
  "type": "TABLE",
  "title": string,
  "data": {
    "columns": [ { "id": string, "label": string } ],
    "rows": [ { "<columnId>": "<cell text>", ... }  /* one key per column id, for every column */ ]
  }
}

Column "id"s must be short unique strings (e.g. "concept", "definition"). Every row must have a key for every column id. Keep cell text plain — no Markdown, no HTML.`,

  [ArtifactType.FAQ]: `Produce a list of the most important questions a reader would have, each followed by a concise answer.

Respond with ONLY a JSON object matching this exact shape:
{
  "schemaVersion": 1,
  "type": "FAQ",
  "title": string,
  "data": {
    "items": [
      {
        "id": string,
        "question": string,
        "answer": string,
        "sourceRefs": string[] (optional, e.g. ["1","2"])
      }
    ]
  }
}

Each "id" must be a short unique string (e.g. "faq-1", "faq-2"). Keep "question" and "answer" clear and focused.`,
};

export function buildArtifactMarkdownSystemPrompt(
  title: string,
  type: ArtifactType,
): string {
  return `You generate a "${title}" artifact for a notebook research assistant, grounded ONLY in the notebook context provided below.

${ARTIFACT_TYPE_INSTRUCTIONS[type]}

Rules:
- Use ONLY the notebook context below — never invent facts not present in it.
- Cite claims inline using bracketed numbers matching the numbered sources below, e.g. [1].
- If the notebook context is too thin to fully satisfy the request, produce what you can from it and note the gap rather than fabricating the rest.
- Output well-formatted Markdown.`;
}

export function buildArtifactUserPrompt(
  generationPrompt: string,
  notebookContextBlock: string,
): string {
  return `Request: ${generationPrompt}

Notebook context:

${notebookContextBlock}`;
}

export function buildStructuredArtifactSystemPrompt(
  title: string,
  type: StructuredArtifactType,
): string {
  return `You generate structured data for a "${title}" artifact (${type}) for a notebook research assistant, grounded ONLY in the notebook context provided below.

${STRUCTURED_ARTIFACT_INSTRUCTIONS[type]}

Rules:
- Use ONLY the notebook context below — never invent facts not present in it.
- Respond with ONLY the JSON object described above.
- Do NOT return Markdown.
- Do NOT wrap the JSON in code fences.
- The JSON must exactly match the required schema.`;
}

export function buildStructuredArtifactUserPrompt(
  generationPrompt: string,
  notebookContextBlock: string,
): string {
  return `Request: ${generationPrompt}

Notebook context:

${notebookContextBlock}`;
}
