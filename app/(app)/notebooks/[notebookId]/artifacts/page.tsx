
import { ArtifactManagement } from "@/components/artifacts/artifact-management";

export default async function NotebookArtifactsPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;

  return (
    <div className="px-6 py-6 md:px-10">
      <ArtifactManagement workspaceId={notebookId} />
    </div>
  );
}
