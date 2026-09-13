import { z } from "zod";
import { CHAT_MODELS } from "../../lib/ai-config";

/**
 * Validators for the Conversation/Message API surface.
 *
 * Route param naming follows the actual folder structure:
 * `app/api/workspaces/[id]/conversations/[conversationId]/...`
 * so the merged Next.js params object is `{ id, conversationId }`,
 * where `id` is the workspace id (matches `workspace-validator`'s
 * `workspaceIdParamSchema`, which is reused for the collection route).
 */

export const createConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .optional(),

  model: z.enum(CHAT_MODELS).optional(),
});

export const updateConversationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title is too long")
      .optional(),

    model: z.enum(CHAT_MODELS).optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

/** Params for routes nested under `/conversations/[conversationId]`. */
export const conversationParamsSchema = z.object({
  workspaceId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1),
});

export const listMessagesQuerySchema = z.object({
  /** Max messages to return, most recent first before re-ordering to asc. */
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** Return messages created strictly before this ISO timestamp (for pagination / "load older"). */
  before: z.iso.datetime().optional(),
});

export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;

export type UpdateConversationInput = z.infer<
  typeof updateConversationSchema
>;

export type ConversationParams = z.infer<typeof conversationParamsSchema>;

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(8000, "Message is too long"),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

export type SendMessageInput = z.infer<typeof sendMessageSchema>;