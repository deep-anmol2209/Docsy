/**
 * Chat orchestrator — full pipeline through Phase 6:
 *
 *   verify conversation ownership
 *     -> persist user message
 *     -> retrieve notebook chunks (hybrid RAG, best-effort)
 *     -> search relevant user memories (Mem0, best-effort)
 *     -> build context (system + memories + summary + chunks + recent history + user msg)
 *     -> stream from OpenAI
 *     -> persist assistant message + citations once the stream completes
 *     -> enqueue conversation/summarize if enough new messages have piled up
 *     -> extract durable memories from this turn into Mem0
 */

import type { ArtifactType, Prisma } from "@/lib/generated/prisma/client";
import { MessageRole } from "@/lib/generated/prisma/enums";
import { getChatClient } from "@/lib/openai";
import {
  resolveChatModel,
  RECENT_MESSAGE_WINDOW,
  CONVERSATION_SUMMARY_INTERVAL,
  NOTEBOOK_CONTEXT_TOKEN_BUDGET,
} from "@/lib/ai-config";
import { inngest, CONVERSATION_SUMMARIZE_EVENT } from "@/src/inngest/client";
import * as conversationService from "@/src/services/conversation/conversation-service";
import * as conversationRepository from "@/src/repositories/conversation-repository";
import * as messageRepository from "@/src/repositories/message-repository";
import { listSourceMetadataForWorkspace } from "@/src/repositories/source-repository";
import {
  retrieveChunksForWorkspace,
  type RetrievedChunk,
} from "@/src/services/retrival/retrival-service";
import { buildBudgetedChunkBlock } from "@/src/services/retrival/format-chunk";
import { buildChatMessages } from "@/src/services/chat/context-builder";
import {
  searchUserMemories,
  extractMemoriesFromTurn,
} from "@/src/services/memory/memory-service";
import { logger } from "@/src/utils/logger";
import {
  artifactTypeForIntent,
  ChatIntent,
  QueryRoute,
  routeQuery,
} from "./intent-service";
import { requestArtifactGeneration } from "../artifact/artifact-service";
import { resolveArtifactContext } from "./artifact-context-resolver";

function toCitations(chunks: RetrievedChunk[]): Prisma.InputJsonValue | undefined {
  if (chunks.length === 0) return undefined;

  // Strip undefined fields — Json columns can't round-trip `undefined`.
  return JSON.parse(
    JSON.stringify(
      chunks.map((chunk) => ({
        sourceId: chunk.sourceId,
        chunkId: chunk.chunkId,
        sourceTitle: chunk.sourceTitle,
        page: chunk.page,
        heading: chunk.heading,
        section: chunk.section,
        slideNumber: chunk.slideNumber,
        startTimeSeconds: chunk.startTimeSeconds,
        endTimeSeconds: chunk.endTimeSeconds,
      })),
    ),
  );
}

export async function streamChatResponse(params: {
  workspaceId: string;
  conversationId: string;
  userId: string;
  message: string;
  queryRoute?: QueryRoute;
  artifactIntent?: ChatIntent;
}): Promise<ReadableStream<Uint8Array>> {
  console.log("artifactIntent: ", params.artifactIntent);
  
  const conversation = await conversationService.getConversationForWorkspace(
    params.workspaceId,
    params.conversationId,
    params.userId,
  );

  // Fetched BEFORE persisting the new user message below — otherwise it
  // would show up in `recentMessages` AND get appended again explicitly
  // by `buildChatMessages`, duplicating the current turn as the last two
  // messages sent to the model.
  const recentMessages = await messageRepository.getRecentMessages(
    params.conversationId,
    RECENT_MESSAGE_WINDOW,
  );

  // Persisted up front so the user's turn survives even if generation fails.
const userMessage=  await messageRepository.createMessage({
    conversationId: params.conversationId,
    role: MessageRole.USER,
    content: { text: params.message },
  });

  const notebookSources = await listSourceMetadataForWorkspace(
    params.workspaceId,
    params.userId,
  ).catch((error) => {
    logger.error("Failed to list notebook sources for query routing", error);
    return [];
  });

  const queryRoute =
    params.queryRoute ??
    (await routeQuery({
      message: params.message,
      recentMessages,
      notebookSources,
    }));

  console.log("\n========== CHAT ROUTE ==========");
  console.log("Message:", params.message);
  console.log("Query route:", queryRoute);

  const resolvedContext = resolveArtifactContext({
    request: params.message,
    recentMessages,
  });
  const hasResolvedReference = Boolean(
    resolvedContext.resolvedQuery || resolvedContext.resolvedContent,
  );
  const shouldRetrieve = queryRoute === "NOTEBOOK" || hasResolvedReference;
  const retrievalQuery = resolvedContext.resolvedQuery ?? params.message;

  console.log("Resolved context:", resolvedContext);
  console.log("Should retrieve:", shouldRetrieve);
  console.log("Retrieval query:", retrievalQuery);
  console.log("================================\n");

  const [retrievedChunks, userMemories] = await Promise.all([
    shouldRetrieve
      ? retrieveChunksForWorkspace(
          params.workspaceId,
          retrievalQuery,
          undefined,
          resolvedContext.sourceIds,
        ).catch((error) => {
          logger.error("Retrieval failed; continuing chat without notebook context", error);
          return [] as RetrievedChunk[];
        })
      : Promise.resolve([] as RetrievedChunk[]),
    searchUserMemories(params.userId, params.message).catch((error) => {
      logger.error("User memory search failed; continuing without it", error);
      return [] as string[];
    }),
  ]);

  console.log("\n========== RETRIEVAL RESULT ==========");
  console.log("Message:", params.message);
  console.log("Route:", queryRoute);
  console.log("Should retrieve:", shouldRetrieve);
  console.log("Retrieved chunks:", retrievedChunks.length);

  console.log(
    "Retrieved sources:",
    retrievedChunks.map((chunk) => ({
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      page: chunk.page,
      startTimeSeconds: chunk.startTimeSeconds,
      endTimeSeconds: chunk.endTimeSeconds,
      score: chunk.score,
    }))
  );

  console.log("======================================\n");

  // Cap the notebook-context block itself (not just history) so
  // `CONTEXT_TOKEN_BUDGET` is a real ceiling, not just advisory — and use
  // this exact trimmed set for the persisted citations too, so what the
  // model was actually shown always matches what the user is shown.
  const { includedChunks: groundedChunks } = buildBudgetedChunkBlock(
    retrievedChunks,
    NOTEBOOK_CONTEXT_TOKEN_BUDGET,
  );

  const chatMessages = buildChatMessages({
    recentMessages,
    conversationSummary: conversation.summary,
    retrievedChunks: groundedChunks,
    userMemories,
    userMessage: params.message,
  });

  const model = resolveChatModel(conversation.model);
  const citations = toCitations(groundedChunks);

  console.log("\n========== CITATIONS ==========");
  console.log("Grounded chunks:", groundedChunks.length);
  console.log("Citations:", citations);
  console.log("===============================\n");

  const encoder = new TextEncoder();
  let fullText = "";
  let artifact: {
    id: string;
    type: ArtifactType;

  } | null = null;

  

  
  // Wired into the stream's `cancel()` below so that when the client stops
  // generation (aborts the fetch), the OpenAI request actually stops too —
  // without this, the request keeps running and burning tokens server-side
  // with nowhere to send the output once the client has disconnected.
  const abortController = new AbortController();

  async function persistAssistantTurn() {
    console.log("assistant artifact: ", artifact);
    
    await messageRepository.createMessage({
      conversationId: params.conversationId,
      role: MessageRole.ASSISTANT,
      content: { text: fullText },
      citations,
      model,
      metadata: artifact ? {
        artifacts: [
          {
            artifactId: artifact.id,
            type: artifact.type
          }
        ]
      } : undefined
    });

    await conversationRepository.touchConversation(params.conversationId).catch((error)=> logger.error("failed to touch conversation", error));

    await maybeEnqueueSummarization(params.conversationId, conversation.summaryMessageCount);

    // Awaited (not truly detached) so it can't get killed by the
    // serverless function suspending right after the response
    // finishes — but since it runs after all stream chunks were
    // already enqueued, it adds no latency the client can perceive.
    // `extractMemoriesFromTurn` already catches its own errors.
    await extractMemoriesFromTurn(params.userId, params.message, fullText);
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        console.log("Chat stream start");

          if (params.artifactIntent && params.artifactIntent !== "CHAT") {
    const artifactType = artifactTypeForIntent(params.artifactIntent);
    if (artifactType) {
      artifact = await requestArtifactGeneration({
        conversationId: params.conversationId,
        workspaceId: params.workspaceId,
        userId: params.userId,
       generationPrompt: params.message,
       type: artifactType
      });
    }
  }

  console.log("artifact created: ", artifact);
        
        const client= getChatClient("groq")
        console.log("before llm request");
        
        const completion = await client.chat.completions.create(
          {
            model,
            messages: chatMessages,
            stream: true,
          },
          { signal: abortController.signal },
        );
  console.log("llm stream created");
  
        for await (const part of completion) {
          const delta = part.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
    console.log("llm stream completed");
    console.log("full text length: ", fullText.length);
    

    
        // Only a successful, complete stream produces an assistant message —
        // a failure below never creates a misleading "successful" turn.
        await persistAssistantTurn();
console.log("assistant turn persisted");

        controller.close();
      } catch (error) {
        console.log("chat stream error: ", error);
        
        if (abortController.signal.aborted) {
          // Stopped intentionally, not a failure — persist whatever
          // generated so far (same as a normal completed turn) instead of
          // discarding a partial-but-real answer.
          console.log("chat stream aborted");
          
          if (fullText.trim()) {
            await persistAssistantTurn().catch((persistError) =>
              logger.error("Failed to persist partial assistant turn after stop", persistError),
            );
          }
          controller.close();
          return;
        }

        logger.error("Chat generation failed", error);

        await messageRepository.deleteMessage(userMessage.id).catch((cleanupError)=> {
          logger.error("failed to cleanup user message after chat generation failed", cleanupError)
        })
        controller.error(error);
      }
    },
    cancel() {
      abortController.abort();
    },
  });
}

/**
 * Enqueues `conversation/summarize` (Phase 7) once enough new messages have
 * accumulated since the last summary — never summarizes on every message.
 * This only submits the event; the actual LLM summarization call happens
 * later in the Inngest function, off the chat request path entirely.
 */
async function maybeEnqueueSummarization(
  conversationId: string,
  summaryMessageCount: number,
): Promise<void> {
  try {
    const totalMessages = await messageRepository.countMessagesForConversation(
      conversationId,
    );
     console.log("cal= ",totalMessages - summaryMessageCount);
     
    if (totalMessages - summaryMessageCount < CONVERSATION_SUMMARY_INTERVAL) {
      return;
    }

    await inngest.send({
      name: CONVERSATION_SUMMARIZE_EVENT,
      data: { conversationId },
    });
  } catch (error) {
    // Summarization is best-effort background maintenance — never let a
    // failure to enqueue it affect the chat response that already streamed.
    logger.error("Failed to enqueue conversation summarization", error);
  }
}