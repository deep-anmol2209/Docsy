import { z } from "zod";

import { DocumentType } from "@/src/common-types/enums";

export const createDocumentSchema = z.object({
  sourceId: z.string().min(1),

  title: z.string().trim().min(1).max(255),

  documentType: z.nativeEnum(DocumentType).default(DocumentType.UNKNOWN),

  language: z.string().trim().optional(),

  pageCount: z.number().int().nonnegative().optional(),

  durationSeconds: z.number().nonnegative().optional(),

  chunkCount: z.number().int().nonnegative().default(0),

  parserName: z.string().trim().min(1),

  parserVersion: z.string().trim().min(1),

  analyzerVersion: z.string().trim().min(1),

  isScanned: z.boolean().default(false),

  requiresOCR: z.boolean().default(false),

  metadataSummary: z.record(z.string(), z.unknown()).optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;