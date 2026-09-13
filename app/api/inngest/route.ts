import { serve } from 'inngest/next';
import { inngest } from '../../../src/inngest/client';
import { runIngestionJob } from '../../../src/inngest/functions/run-ingestion';
import { sourceIngestionRequestedFunction } from '../../../src/inngest/functions/source-ingestion-requested';
import { conversationSummarizeFunction } from '../../../src/inngest/functions/conversation-summarize';
import { artifactGenerateFunction } from '@/src/inngest/functions/artifact-generator';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runIngestionJob, sourceIngestionRequestedFunction, conversationSummarizeFunction, artifactGenerateFunction]
});