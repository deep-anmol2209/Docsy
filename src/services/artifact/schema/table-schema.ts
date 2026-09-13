
import { z } from "zod";

export const tableColumnSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const tableDataSchema = z
  .object({
    columns: z.array(tableColumnSchema).min(1, "At least one column is required"),
    /** Each row is a map of columnId -> cell text. Renderer looks cells up by column id, not array position, so column order can't desync from row data. */
    rows: z.array(z.record(z.string(), z.string())).min(1, "At least one row is required"),
  })
  .refine(
    (table) => {
      const columnIds = new Set(table.columns.map((c) => c.id));
      return table.rows.every((row) => Object.keys(row).every((key) => columnIds.has(key)));
    },
    { message: "Every row key must match a defined column id", path: ["rows"] },
  );

export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableData = z.infer<typeof tableDataSchema>;