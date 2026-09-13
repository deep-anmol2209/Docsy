import { z } from "zod";

import  { JobState } from "@/src/common-types/enums";
import { KNOWN_SOURCE_TYPES } from "@/src/common-types/enums";
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

export const createSourceDbSchema = z.object({
  workspaceId: z.string(),

  type: z.enum(KNOWN_SOURCE_TYPES),

  title: z.string(),

  content: z.string().optional(),
  url: z.string().optional(),

  originalReference: z.string().optional(),

  storageLocation: z.string().optional(),

  cloudinaryPublicId: z.string().optional(),
  cloudinarySecureUrl: z.string().optional(),

  mimeType: z.string().optional(),
  fileSizeBytes: z.number().optional(),

  ingestionStatus: z.enum(JobState),

  uploadMetadata: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSourceDbSchema =
  createSourceDbSchema.partial();

export type CreateSourceDbInput =
  z.infer<typeof createSourceDbSchema>;

export type UpdateSourceDbInput =
  z.infer<typeof updateSourceDbSchema>;

  export type WorkspaceIdParamInput =
  z.infer<typeof workspaceIdParamSchema>;