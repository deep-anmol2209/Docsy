import { NotebookOverview } from "@/components/notebook/notebook-overeview";
import { SourceManagement } from "@/components/sources/source-management";

export default async function NotebookSourcesPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;

  return (
    <div className="px-6 py-6 md:px-10">
      <SourceManagement workspaceId={notebookId} />
    </div>
  );
}
