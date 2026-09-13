
import { z } from "zod";
import { ArtifactType, ArtifactStatus } from "@/lib/generated/prisma/enums";

const artifactTypeValues = Object.values(ArtifactType) as [string, ...string[]];
const artifactStatusValues = Object.values(ArtifactStatus) as [string, ...string[]];

/** Params for routes nested under `/artifacts/[artifactId]`. `id` is the workspace id — see `chat-validator.ts` for the same convention. */
export const artifactParamsSchema = z.object({
  workspaceId: z.string().trim().min(1),
  artifactId: z.string().trim().min(1),
});

export const listArtifactsQuerySchema = z.object({
  type: z.enum(artifactTypeValues).optional(),
  status: z.enum(artifactStatusValues).optional(),
});

/** Direct artifact creation (outside the chat intent-detection path) — the type is explicit, not inferred. */
export const createArtifactSchema = z.object({
  type: z.enum(artifactTypeValues),
  generationPrompt: z
    .string()
    .trim()
    .min(1, "generationPrompt is required")
    .max(4000, "generationPrompt is too long"),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const updateArtifactSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    isPinned: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type ArtifactParams = z.infer<typeof artifactParamsSchema>;
export type ListArtifactsQuery = z.infer<typeof listArtifactsQuerySchema>;
export type CreateArtifactInput = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>;
