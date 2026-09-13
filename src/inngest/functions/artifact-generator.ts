import { inngest, ARTIFACT_GENERATE_EVENT } from "@/src/inngest/client";
import * as artifactRepository from "@/src/repositories/artifact-repository";
import { generateArtifactContent } from "@/src/services/artifact/artifact-generator";
import { ARTIFACT_MODEL } from "@/lib/ai-config";

type ArtifactGenerateEventData = {
  artifactId: string;
};

function asMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Background job for artifact generation (Phase 9).
 *
 * Idempotency: guarded by `Artifact.status` — a duplicate/retried event
 * for an artifact that's already `READY`/`FAILED` (not `GENERATING`)
 * no-ops instead of regenerating. Within a single run, `step.run`'s
 * durable execution means a retried "generate-content" step re-attempts
 * generation with the *original* loaded artifact (memoized), and
 * "mark-failed" only fires once Inngest's own retries for that step are
 * exhausted — not on every transient failure.
 */
export const artifactGenerateFunction = inngest.createFunction(
  {
    id: "artifact-generate",
    name: "Generate artifact",
    triggers: [{ event: ARTIFACT_GENERATE_EVENT }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: ArtifactGenerateEventData };
    step: any;
  }) => {
    const { artifactId } = event.data;

    if (!artifactId) {
      throw new Error("[ArtifactGenerate] artifactId is required");
    }

    const artifact = await step.run("load-artifact", () =>
      artifactRepository.getArtifactById(artifactId),
    );

    if (!artifact) {
      // Deleted between enqueue and run — not a failure worth retrying.
      return { skipped: true, reason: "artifact-not-found" };
    }

    if (artifact.status !== "GENERATING") {
      return { skipped: true, reason: "already-processed", status: artifact.status };
    }

    try {
      const result = await step.run("generate-content", () =>
        generateArtifactContent({
          workspaceId: artifact.workspaceId,
          type: artifact.type,
          title: artifact.title,
          generationPrompt: artifact.generationPrompt ?? artifact.title,
        }),
      );

      await step.run("persist-result", async () => {
        await artifactRepository.markArtifactReady(artifactId, {
          content: result.content,
          modelUsed: ARTIFACT_MODEL,
          tokenUsage: result.tokenUsage,
          metadata: {
            ...asMetadataObject(artifact.metadata),
            sourceCount: result.sourceIds.length,
            // Structured artifacts (FLASHCARDS/QUIZ/MIND_MAP/TABLE) carry
            // their validated envelope here — this is what the frontend
            // renders from. `content` above is still a Markdown export of
            // the same data, kept only for the existing Copy/Download
            // features. Absent entirely for non-structured types.
            ...(result.structuredData ? { artifactData: result.structuredData } : {}),
          },
        });
        await artifactRepository.linkArtifactSources(artifactId, result.sourceIds);
      });

      return { artifactId, status: "READY" };
    } catch (error) {
      await step.run("mark-failed", () =>
        artifactRepository.markArtifactFailed(artifactId, {
          ...asMetadataObject(artifact.metadata),
          failureReason: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
        }),
      );

      // Rethrown so the run still shows as failed in Inngest's dashboard.
      throw error;
    }
  },
);