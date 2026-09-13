import { z } from "zod";

export const faqItemSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  sourceRefs: z.array(z.string()).optional(),
});

export const faqDataSchema = z.object({
  items: z.array(faqItemSchema).min(1, "At least one FAQ item is required"),
});

export type FAQItem = z.infer<typeof faqItemSchema>;
export type FAQData = z.infer<typeof faqDataSchema>;
