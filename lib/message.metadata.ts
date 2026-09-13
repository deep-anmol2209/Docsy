export type ArtifactMessageMetadata = {
  artifacts: Array<{
    artifactId: string;
    type: string;
  }>;
};

export function getMessageArtifacts(
  metadata: Record<string, unknown> | null | undefined,
): ArtifactMessageMetadata["artifacts"] {
  if (!metadata || !Array.isArray(metadata.artifacts)) {
    return [];
  }

  return metadata.artifacts.filter(
    (artifact): artifact is { artifactId: string; type: string } =>
      typeof artifact === "object" &&
      artifact !== null &&
      "artifactId" in artifact &&
      typeof artifact.artifactId === "string" &&
      "type" in artifact &&
      typeof artifact.type === "string",
  );
}