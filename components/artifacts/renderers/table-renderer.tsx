"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Table2 } from "lucide-react";
import { Streamdown } from "streamdown";
import type { TableData } from "@/types";

type TableRendererProps = {
  data: TableData;
};

export function TableRenderer({ data }: TableRendererProps) {
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];

  const [search, setSearch] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filtering
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(query)
      )
    );
  }, [rows, search]);

  // Sorting
  const sortedRows = useMemo(() => {
    if (!sortColumnId) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = String(a[sortColumnId] ?? "").toLowerCase();
      const valB = String(b[sortColumnId] ?? "").toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortColumnId, sortDirection]);

  const toggleSort = (columnId: string) => {
    if (sortColumnId === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumnId(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumnId(columnId);
      setSortDirection("asc");
    }
  };

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <Table2 className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">
          No table columns available
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Table2 className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Data Table
            </h3>
            <p className="text-xs text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"} &bull; {columns.length} column{columns.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {rows.length > 3 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table..."
              className="h-9 w-full rounded-xl border bg-background/80 pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="w-full overflow-hidden rounded-2xl border bg-card/60 shadow-xs backdrop-blur-xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {columns.map((column) => {
                  const isSorted = sortColumnId === column.id;
                  return (
                    <th
                      key={column.id}
                      onClick={() => toggleSort(column.id)}
                      className="group cursor-pointer select-none px-4 py-3 hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.label}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="size-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="size-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {columns.map((column) => {
                      const cellValue = row[column.id] ?? "—";
                      return (
                        <td
                          key={column.id}
                          className="px-4 py-3.5 align-top text-foreground leading-relaxed"
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm">
                            {typeof cellValue === "string" && cellValue.length > 0 ? (
                              <Streamdown>{cellValue}</Streamdown>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-xs text-muted-foreground"
                  >
                    No matching rows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}