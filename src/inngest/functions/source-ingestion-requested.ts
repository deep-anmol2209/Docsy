import { inngest } from '../client';
import { prisma } from '../../../lib/db';
import { runPipeline } from '../../pipeline/pipeline-orchestrator';
import { JobState } from '../../common-types/enums';
import type { PipelineContext } from '../../pipeline/pipeline-context';
import type { SourceInput } from '../../common-types/source-model';
import type { SourceRecord } from '../../schema/sources.schema';
import type { Job } from '../../common-types/job.model';

export const SOURCE_INGESTION_REQUESTED_EVENT = 'app/source.ingestion_requested';

type SourceIngestionRequestedEventData = {
  sourceId: string;
  jobId?: string;
  sourceRecord?: SourceRecord;
  sourceInput?: SourceInput;
};

const db = prisma as any;

async function loadSourceRecord(sourceId: string): Promise<SourceRecord> {
  const source = await db.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      originalReference: true,
      content: true,
      storageLocation: true,
      cloudinaryPublicId: true,
      cloudinarySecureUrl: true,
      mimeType: true,
      fileSizeBytes: true,
      ingestionStatus: true,
      uploadMetadata: true,
    type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!source) {
    throw new Error(`[SourceIngestionRequested] Source not found: ${sourceId}`);
  }

  return {
    ...source,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  } as unknown as SourceRecord;
}

function buildPipelineJob(jobId: string, sourceId: string, existingJob?: { id: string; sourceId: string; state: string; retryCount: number; maxRetries: number; createdAt: Date; updatedAt: Date }): Job {
  return {
    id: jobId,
    sourceId,
    state: JobState.QUEUED,
    stageHistory: [],
    retryCount: existingJob?.retryCount ?? 0,
    maxRetries: existingJob?.maxRetries ?? 3,
    createdAt: existingJob?.createdAt.toISOString() ?? new Date().toISOString(),
    updatedAt: existingJob?.updatedAt.toISOString() ?? new Date().toISOString(),
  };
}

export const sourceIngestionRequestedFunction = inngest.createFunction(
  {
    id: 'source-ingestion-requested',
    name: 'Source ingestion requested',
    triggers: [{ event: SOURCE_INGESTION_REQUESTED_EVENT }],
  },
  async ({ event }: { event: { data: SourceIngestionRequestedEventData } }) => {
    const { sourceId, jobId, sourceRecord, sourceInput } = event.data;

    if (!sourceId) {
      throw new Error('[SourceIngestionRequested] sourceId is required');
    }

    const resolvedSourceRecord =
      sourceRecord ?? (await loadSourceRecord(sourceId));

    const persistedJob = jobId
      ? await db.job.findUnique({ where: { id: jobId } })
      : null;

    const createdJob =
      persistedJob ??
      (await db.job.create({
        data: {
          sourceId,
          state: 'QUEUED',
          currentStage: 'QUEUED',
          retryCount: 0,
          maxRetries: 3,
        },
      }));


    const pipelineContext: PipelineContext = {
      sourceId,
      jobId: createdJob.id,
      sourceRecord: resolvedSourceRecord as SourceRecord,
      sourceInput,
      job: buildPipelineJob(createdJob.id, sourceId, persistedJob ?? createdJob),
    };

    const result = await runPipeline(pipelineContext);
if(result.job.state === JobState.FAILED){
  throw new Error(
    result.job.lastError?.message || `Source Ingestion Failed : ${sourceId}`,
    
  )
}
    return {
      ok: true,
      sourceId,
      jobId: createdJob.id,
      context: result,
    };
  }
);
