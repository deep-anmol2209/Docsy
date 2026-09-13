
import { z } from "zod";

export type MindMapNode = {
  id: string;
  label: string;
  children?: MindMapNode[];
};

/** Recursive — `z.lazy` is required since Zod can't infer a self-referencing shape eagerly. Depth is capped at generation-prompt level (4 levels), not enforced here. */
export const mindMapNodeSchema: z.ZodType<MindMapNode> = z.lazy(() =>
  z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    children: z.array(mindMapNodeSchema).optional(),
  }),
);

export const mindMapDataSchema = z.object({
  root: mindMapNodeSchema,
});

export type MindMapData = z.infer<typeof mindMapDataSchema>;