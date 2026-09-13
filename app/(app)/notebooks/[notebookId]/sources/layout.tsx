import { NotebookHeader } from "@/components/notebook/notebook-header";

export default async function NotebookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;

  return (
    <div className="flex h-svh flex-col">
      <NotebookHeader notebookId={notebookId} />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}