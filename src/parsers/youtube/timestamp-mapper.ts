import { BlockType } from '../../common-types/enums';
import type { DocumentBlock } from '../../common-types/document-model';

export interface RawTranscriptEvent {
  readonly text: string;
  readonly start?: number; // seconds
  readonly duration?: number; // seconds
  readonly speaker?: string;
}

export function mapTranscriptEvents(events: readonly RawTranscriptEvent[]): DocumentBlock[] {
  if (!events || events.length === 0) {
    return [];
  }

  const blocks: DocumentBlock[] = [];
  let currentBlockOrder = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const text = (event.text || '').trim();
    if (!text) {
      continue;
    }

    const startTimeSeconds = typeof event.start === 'number' ? Math.max(0, event.start) : undefined;
    let endTimeSeconds: number | undefined;

    if (typeof startTimeSeconds === 'number') {
      if (typeof event.duration === 'number' && event.duration > 0) {
        endTimeSeconds = startTimeSeconds + event.duration;
      } else if (i < events.length - 1 && typeof events[i + 1].start === 'number') {
        endTimeSeconds = events[i + 1].start;
      }
    }

    blocks.push({
      id: `block-${currentBlockOrder}`,
      type: BlockType.TRANSCRIPT_SEGMENT,
      content: text,
      order: currentBlockOrder,
      startTimeSeconds,
      endTimeSeconds,
      speaker: event.speaker,
    });

    currentBlockOrder++;
  }

  return blocks;
}
