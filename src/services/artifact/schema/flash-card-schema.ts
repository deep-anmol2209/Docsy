

import { z } from "zod";

export const flashcardSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  /** Bracketed source numbers from the generation prompt, e.g. ["1", "3"] — optional, informational only. */
  sourceRefs: z.array(z.string()).optional(),
});

export const flashcardsDataSchema = z.object({
  cards: z.array(flashcardSchema).min(1, "At least one flashcard is required"),
});

export type Flashcard = z.infer<typeof flashcardSchema>;
export type FlashcardsData = z.infer<typeof flashcardsDataSchema>;