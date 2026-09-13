"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, FileStack, MessageSquare, Sparkles, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { RenameNotebookDialog } from "@/components/notebook/rename-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const NOTEBOOK_NAV = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Sources", href: "/sources", icon: FileStack },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Artifacts", href: "/artifacts", icon: Sparkles },
];

export function NotebookHeader({ notebookId }: { notebookId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { workspace, isLoading } = useWorkspace(notebookId);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />

        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/notebooks" />}>Notebooks</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {isLoading ? "Loading..." : workspace?.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddSourceOpen(true)}>
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Add Source</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Notebook settings</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                Delete notebook
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {workspace && !isLoading && (
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          {workspace._count?.sources ?? 0} source{workspace._count?.sources === 1 ? "" : "s"} ·
          Updated {new Date(workspace.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      )}

      {/* Sidebar already carries this nav on desktop — this strip exists only for
          when the sidebar collapses to a Sheet on small screens. */}
      <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-2 py-1.5 md:hidden">
        {NOTEBOOK_NAV.map((item) => {
          const href = `/notebooks/${notebookId}${item.href}`;
          const isActive = item.href === "" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={item.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {workspace && (
        <>
          <AddSourceDialog workspaceId={notebookId} open={addSourceOpen} onOpenChange={setAddSourceOpen} />
          <RenameNotebookDialog workspace={workspace} open={renameOpen} onOpenChange={setRenameOpen} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete "${workspace.title}"?`}
            description="This permanently deletes the notebook, its sources, conversations, and artifacts. This can't be undone."
            confirmLabel="Delete"
            onConfirm={async () => {
              try {
                await apiClient.delete(`/api/workspaces/${notebookId}`);
                toast.success("Notebook deleted");
                router.push("/notebooks");
              } catch (error) {
                toast.error(error instanceof ApiClientError ? error.message : "Failed to delete notebook");
              }
            }}
          />
        </>
      )}
    </div>
  );
}