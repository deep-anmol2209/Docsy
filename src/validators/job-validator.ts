import { z } from "zod";

import { JobState } from "@/src/common-types/enums";

export const createJobSchema = z.object({
  sourceId: z.string().min(1),

  state: z.nativeEnum(JobState),

  currentStage: z.nativeEnum(JobState),

  retryCount: z.number().int().nonnegative().default(0),

  maxRetries: z.number().int().positive().default(3),

  failureReason: z.string().optional(),

  checkpoints: z.record(z.string(), z.unknown()).optional(),

  metrics: z.record(z.string(), z.unknown()).optional(),
});

export const updateJobSchema = createJobSchema.partial();

export type CreateJobInput = z.infer<typeof createJobSchema>;

export type UpdateJobInput = z.infer<typeof updateJobSchema>;