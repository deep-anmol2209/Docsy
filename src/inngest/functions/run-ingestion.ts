import { inngest, INGESTION_REQUESTED_EVENT } from '../client';
import { runPipeline } from '../../pipeline/pipeline-orchestrator';
import type { PipelineContext } from '../../pipeline/pipeline-context';

export const runIngestionJob = inngest.createFunction(
  {
    id: 'run-ingestion-job',
    name: 'Run ingestion pipeline',
    triggers: [{ event: INGESTION_REQUESTED_EVENT }],
  },
  async ({ event }: { event: { data: { context: PipelineContext } } }) => {
    const context = event.data.context as PipelineContext;
    const result = await runPipeline(context);

    return {
      ok: true,
      context: result,
    };
  }
);
