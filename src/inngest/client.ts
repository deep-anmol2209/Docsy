import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'mylm',
  name: 'mylm ingestion pipeline',
});

export const INGESTION_REQUESTED_EVENT = 'app/ingestion.requested';
export const SOURCE_INGESTION_REQUESTED_EVENT = 'app/source.ingestion_requested';

/** Payload: `{ conversationId: string }`. See `src/inngest/functions/conversation-summarize.ts`. */
export const CONVERSATION_SUMMARIZE_EVENT = 'conversation/summarize';
export const ARTIFACT_GENERATE_EVENT= 'artifact/generate'