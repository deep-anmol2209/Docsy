// /**
//  * Artifact content generation (Phase 9) — runs inside the Inngest
//  * background job, never on a request path. Retrieves a broad slice of
//  * notebook content (much wider than a single chat turn) and generates
//  * the artifact body grounded in it.
//  */

// import { getChatClient, openai } from "@/lib/openai";
// import {
//   ARTIFACT_MODEL,
//   ARTIFACT_RETRIEVAL_TOP_K,
//   ARTIFACT_CONTEXT_TOKEN_BUDGET,
// } from "@/lib/ai-config";
// import { ArtifactType } from "@/lib/generated/prisma/enums";
// import { retrieveChunksForWorkspace } from "@/src/services/retrival/retrival-service";
// import { buildBudgetedChunkBlock } from "@/src/services/retrival/format-chunk";

// const ARTIFACT_TYPE_INSTRUCTIONS: Record<ArtifactType, string> = {
//   [ArtifactType.SUMMARY]:
//     "Write a clear, well-organized summary of the material, covering the main ideas and how they connect. Use headings for major sections.",
//   [ArtifactType.STUDY_GUIDE]:
//     "Produce a structured study guide: key concepts grouped under headings, brief explanations, and a short 'key takeaways' section at the end.",
//   [ArtifactType.FAQ]:
//     "Produce a list of the most important questions a reader would have, each followed by a concise answer. Format as '**Q:** ... \\n**A:** ...' pairs.",
//   [ArtifactType.TIMELINE]:
//     "Produce a chronological timeline of events/developments described in the material, as a Markdown list ordered earliest to latest, each entry with a date/period if available and a one-line description.",
//   [ArtifactType.QUIZ]:
//     "Produce a quiz of 8-12 questions (mix of multiple-choice and short-answer) testing understanding of the material, followed by an answer key at the end under a '## Answer Key' heading.",
//   [ArtifactType.FLASHCARDS]:
//     "Produce 10-20 flashcards as 'Q: ...' / 'A: ...' pairs, one pair per concept, covering the most important terms and ideas.",
//   [ArtifactType.NOTES]:
//     "Produce concise, well-organized study notes as nested bullet points grouped under headings.",
//   [ArtifactType.MIND_MAP]:
//     "Produce a hierarchical outline suitable for rendering as a mind map: a root topic, with nested Markdown bullets for sub-topics and their children (max 4 levels deep).",
//   [ArtifactType.TABLE]:
//     "Produce a single well-structured Markdown table organizing the key information (choose sensible columns for the content — e.g. concept/definition/example, or date/event/significance).",
//   [ArtifactType.CUSTOM]:
//     "Produce the document the user asked for, using your best judgement for structure and format based on their request.",
// };

// export type GeneratedArtifact = {
//   content: string;
//   sourceIds: string[];
//   tokenUsage?: {
//     promptTokens: number;
//     completionTokens: number;
//     totalTokens: number;
//   };
// };

// export async function generateArtifactContent(params: {
//   workspaceId: string;
//   type: ArtifactType;
//   title: string;
//   generationPrompt: string;
// }): Promise<GeneratedArtifact> {
//   console.log("generating artifact");
  
//   const chunks = await retrieveChunksForWorkspace(
//     params.workspaceId,
//     params.generationPrompt || params.title,
//     ARTIFACT_RETRIEVAL_TOP_K,
//   );
// console.log("chunks: ", chunks);

//   if (chunks.length === 0) {
//     throw new Error(
//       "No relevant notebook content was found to generate this artifact from. Make sure at least one source in this workspace has finished processing.",
//     );
//   }

//   // Cap the notebook-context block to a real token ceiling — `ARTIFACT_MODEL`
//   // has a large context window, but an unbounded prompt is still an
//   // unbounded cost. `groundedChunks` (best-first, post-rerank) is also what
//   // `ArtifactSource` links get built from below, so the sources an artifact
//   // is *linked to* always match what it was actually generated from.
//   const { text: notebookContextBlock, includedChunks: groundedChunks } =
//     buildBudgetedChunkBlock(chunks, ARTIFACT_CONTEXT_TOKEN_BUDGET);

//   const systemPrompt = `You generate a "${params.title}" artifact for a notebook research assistant, grounded ONLY in the notebook context provided below.

// ${ARTIFACT_TYPE_INSTRUCTIONS[params.type]}

// Rules:
// - Use ONLY the notebook context below — never invent facts not present in it.
// - Cite claims inline using bracketed numbers matching the numbered sources below, e.g. [1].
// - If the notebook context is too thin to fully satisfy the request, produce what you can from it and note the gap rather than fabricating the rest.
// - Output well-formatted Markdown.`;

//   const userPrompt = `Request: ${params.generationPrompt}\n\nNotebook context:\n\n${notebookContextBlock}`;
//    const client= getChatClient("groq")
//   const completion = await client.chat.completions.create({
//     model: ARTIFACT_MODEL,
//     messages: [
//       { role: "system", content: systemPrompt },
//       { role: "user", content: userPrompt },
//     ],
//   });
// console.log(completion);

//   const content = completion.choices[0]?.message?.content?.trim();
// console.log("content: ", content);

//   if (!content) {
//     throw new Error("Artifact generation returned empty content.");
//   }

//   return {
//     content,
//     sourceIds: Array.from(new Set(groundedChunks.map((c) => c.sourceId))),
//     tokenUsage: completion.usage
//       ? {
//           promptTokens: completion.usage.prompt_tokens,
//           completionTokens: completion.usage.completion_tokens,
//           totalTokens: completion.usage.total_tokens,
//         }
//       : undefined,
//   };
// }




/**
 * Artifact content generation — runs inside the Inngest background job,
 * never on a request path. Retrieves a broad slice of notebook content
 * (much wider than a single chat turn) and generates the artifact body
 * grounded in it.
 *
 * Branches by type:
 *   - Structured types (FLASHCARDS, QUIZ, MIND_MAP, TABLE): generates a
 *     validated JSON envelope (see `schemas/`) — the source of truth for
 *     rendering. `content` is still populated with a Markdown export of
 *     that data, purely so the existing Copy/Download features (which
 *     only know how to work with a text string) keep working unchanged.
 *   - Everything else (SUMMARY, STUDY_GUIDE, FAQ, TIMELINE, NOTES,
 *     CUSTOM): unchanged from before — free-form Markdown in `content`,
 *     no structured data. These types are genuinely prose-shaped, so
 *     structuring them wouldn't improve anything.
 */

import { getChatClient, openai } from "@/lib/openai";
import {
  ARTIFACT_MODEL,
  ARTIFACT_RETRIEVAL_TOP_K,
  ARTIFACT_CONTEXT_TOKEN_BUDGET,
} from "@/lib/ai-config";
import { ArtifactType } from "@/lib/generated/prisma/enums";
import { retrieveChunksForWorkspace } from "@/src/services/retrival/retrival-service";
import { buildBudgetedChunkBlock } from "@/src/services/retrival/format-chunk";
import {
  isStructuredArtifactType,
  parseStructuredArtifact,
  type AnyStructuredArtifactEnvelope,
  type StructuredArtifactType,
} from "@/src/services/artifact/schema/index";
import {
  ARTIFACT_TYPE_INSTRUCTIONS,
  buildArtifactMarkdownSystemPrompt,
  buildArtifactUserPrompt,
  buildStructuredArtifactSystemPrompt,
  buildStructuredArtifactUserPrompt,
} from "@/src/config/prompts";
import { structuredArtifactToMarkdown } from "@/src/services/artifact/structured-markdown-export";

export type GeneratedArtifactTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type GeneratedArtifact = {
  /**
   * Markdown representation.
   *
   * For non-structured artifacts this is the source of truth.
   * For structured artifacts this is only a derived convenience export.
   */
  content: string;

  /**
   * Structured JSON representation.
   *
   * This is the source of truth for rendering structured artifacts.
   */
  structuredData?: AnyStructuredArtifactEnvelope;

  sourceIds: string[];
  tokenUsage?: GeneratedArtifactTokenUsage;
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateArtifactContent(params: {
  workspaceId: string;
  type: ArtifactType;
  title: string;
  generationPrompt: string;
}): Promise<GeneratedArtifact> {
  const chunks = await retrieveChunksForWorkspace(
    params.workspaceId,
    params.generationPrompt || params.title,
    ARTIFACT_RETRIEVAL_TOP_K,
  );

  if (chunks.length === 0) {
    throw new Error(
      "No relevant notebook content was found to generate this artifact from. Make sure at least one source in this workspace has finished processing.",
    );
  }

  const {
    text: notebookContextBlock,
    includedChunks: groundedChunks,
  } = buildBudgetedChunkBlock(
    chunks,
    ARTIFACT_CONTEXT_TOKEN_BUDGET,
  );

  const sourceIds = Array.from(
    new Set(groundedChunks.map((chunk) => chunk.sourceId)),
  );

  if (isStructuredArtifactType(params.type)) {
    return generateStructuredArtifact({
      type: params.type,
      title: params.title,
      generationPrompt: params.generationPrompt,
      notebookContextBlock,
      sourceIds,
    });
  }

  return generateMarkdownArtifact({
    type: params.type,
    title: params.title,
    generationPrompt: params.generationPrompt,
    notebookContextBlock,
    sourceIds,
  });
}

/**
 * Existing Markdown generation path.
 *
 * Non-structured artifacts continue to use Markdown exactly as before.
 */
async function generateMarkdownArtifact(params: {
  type: ArtifactType;
  title: string;
  generationPrompt: string;
  notebookContextBlock: string;
  sourceIds: string[];
}): Promise<GeneratedArtifact> {
  const systemPrompt = buildArtifactMarkdownSystemPrompt(params.title, params.type);
  const userPrompt = buildArtifactUserPrompt(
    params.generationPrompt,
    params.notebookContextBlock,
  );
const client = getChatClient("groq");
  const completion = await client.chat.completions.create({
    model: ARTIFACT_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Artifact generation returned empty content.");
  }

  return {
    content,
    sourceIds: params.sourceIds,
    tokenUsage: toTokenUsage(completion.usage),
  };
}

/**
 * Structured artifact generation.
 *
 * The LLM produces JSON.
 * JSON is validated against the type-specific Zod schema.
 * The validated JSON becomes the source of truth.
 * Markdown is generated only as a compatibility/export representation.
 */
async function generateStructuredArtifact(params: {
  type: StructuredArtifactType;
  title: string;
  generationPrompt: string;
  notebookContextBlock: string;
  sourceIds: string[];
}): Promise<GeneratedArtifact> {
  const systemPrompt = buildStructuredArtifactSystemPrompt(
    params.title,
    params.type,
  );

  const userPrompt = buildStructuredArtifactUserPrompt(
    params.generationPrompt,
    params.notebookContextBlock,
  );

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const {
    envelope,
    tokenUsage,
  } = await requestStructuredCompletion(
    params.type,
    messages,
  );

  return {
    content: structuredArtifactToMarkdown(envelope),
    structuredData: envelope,
    sourceIds: params.sourceIds,
    tokenUsage,
  };
}

const MAX_STRUCTURED_ATTEMPTS = 2;

async function requestStructuredCompletion(
  type: StructuredArtifactType,
  messages: ChatMessage[],
  attempt = 1,
): Promise<{
  envelope: AnyStructuredArtifactEnvelope;
  tokenUsage?: GeneratedArtifactTokenUsage;
}> {
  const client= getChatClient("groq")
  const completion = await client.chat.completions.create({
    model: ARTIFACT_MODEL,
    messages,
    response_format: {
      type: "json_object",
    },
  });

  const raw = completion.choices[0]?.message?.content;
  const tokenUsage = toTokenUsage(completion.usage);

  if (!raw) {
    throw new Error("Artifact generation returned empty content.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(raw);
  } catch {
    if (attempt < MAX_STRUCTURED_ATTEMPTS) {
      return requestStructuredCompletion(
        type,
        [
          ...messages,
          {
            role: "assistant",
            content: raw,
          },
          {
            role: "user",
            content:
              "That was not valid JSON. Respond with ONLY the corrected JSON object, nothing else.",
          },
        ],
        attempt + 1,
      );
    }

    throw new Error(
      "Artifact generation did not return valid JSON after a retry.",
    );
  }

  const validation = parseStructuredArtifact(
    type,
    parsedJson,
  );

  if (!validation.success) {
    const issues = validation.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("; ");

    if (attempt < MAX_STRUCTURED_ATTEMPTS) {
      return requestStructuredCompletion(
        type,
        [
          ...messages,
          {
            role: "assistant",
            content: raw,
          },
          {
            role: "user",
            content: `That JSON didn't match the required schema (${issues}). Respond with ONLY the corrected JSON object, nothing else.`,
          },
        ],
        attempt + 1,
      );
    }

    throw new Error(
      `Artifact generation produced invalid structured data: ${issues}`,
    );
  }

  return {
    envelope: validation.data,
    tokenUsage,
  };
}

function toTokenUsage(
  usage:
    | {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }
    | undefined,
): GeneratedArtifactTokenUsage | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}