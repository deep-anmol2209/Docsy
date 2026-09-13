
import { z } from "zod";

export const quizOptionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

export const quizQuestionSchema = z
  .object({
    id: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    options: z.array(quizOptionSchema).min(2, "At least two options are required"),
    correctOptionId: z.string().trim().min(1),
    explanation: z.string().trim().optional(),
    sourceRefs: z.array(z.string()).optional(),
  })
  .refine((question) => question.options.some((option) => option.id === question.correctOptionId), {
    message: "correctOptionId must match one of this question's option ids",
    path: ["correctOptionId"],
  });

export const quizDataSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1, "At least one question is required"),
});

export type QuizOption = z.infer<typeof quizOptionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizData = z.infer<typeof quizDataSchema>;