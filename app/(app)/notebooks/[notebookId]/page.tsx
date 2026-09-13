import { NotebookOverview } from "@/components/notebook/notebook-overeview";

export default async function NotebookOverviewPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;

  return <NotebookOverview notebookId={notebookId} />;
}
