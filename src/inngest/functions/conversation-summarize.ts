import { inngest, CONVERSATION_SUMMARIZE_EVENT } from "@/src/inngest/client";
import { summarizeConversation } from "@/src/services/conversation/conversation-summary";

type ConversationSummarizeEventData = {
  conversationId: string;
};

/**
 * Background job for conversation summarization (Phase 7).
 *
 * Idempotency: `summarizeConversation` re-derives "new messages" from
 * `Conversation.summaryMessageCount` each time it runs rather than trusting
 * anything in the event payload, so a duplicate/retried event that fires
 * after the summary has already advanced just finds zero new messages and
 * no-ops instead of double-summarizing.
 */
export const conversationSummarizeFunction = inngest.createFunction(
  {
    id: "conversation-summarize",
    name: "Summarize conversation",
    triggers: [{ event: CONVERSATION_SUMMARIZE_EVENT }],
  },
  async ({ event, step }: { event: { data: ConversationSummarizeEventData }; step: any }) => {
    const { conversationId } = event.data;

    if (!conversationId) {
      throw new Error("[ConversationSummarize] conversationId is required");
    }

    const result = await step.run("summarize", () =>
      summarizeConversation(conversationId),
    );
  
    return { conversationId, ...result };
  },
);