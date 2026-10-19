

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
  resolvedQuery?: string;
  resolvedContent?: string;
  sourceIds?: string[];
}): Promise<GeneratedArtifact> {
  const hasResolvedContent = Boolean(params.resolvedContent?.trim());
  const chunks = hasResolvedContent
    ? []
    : await retrieveChunksForWorkspace(
        params.workspaceId,
        params.resolvedQuery || params.generationPrompt || params.title,
        ARTIFACT_RETRIEVAL_TOP_K,
        params.sourceIds,
      );

  if (chunks.length === 0 && !hasResolvedContent) {
    throw new Error(
      "No relevant notebook content was found to generate this artifact from. Make sure at least one source in this workspace has finished processing.",
    );
  }

  const { text: retrievedContext, includedChunks: groundedChunks } =
    buildBudgetedChunkBlock(chunks, ARTIFACT_CONTEXT_TOKEN_BUDGET);
  const notebookContextBlock = hasResolvedContent
    ? `[1] "Previous assistant response"\n${params.resolvedContent!.trim()}`
    : retrievedContext;

  const sourceIds = Array.from(
    new Set(
      hasResolvedContent
        ? params.sourceIds ?? []
        : groundedChunks.map((chunk) => chunk.sourceId),
    ),
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