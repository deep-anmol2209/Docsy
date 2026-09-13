import { ArtifactViewer } from "@/components/artifacts/artifact-viewer";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ notebookId: string; artifactId: string }>;
}) {
  const { notebookId, artifactId } = await params;

  return <ArtifactViewer workspaceId={notebookId} artifactId={artifactId} />;
}