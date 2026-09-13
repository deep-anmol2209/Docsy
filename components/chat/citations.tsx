
import { FileText } from "lucide-react";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment";
import type { Citation as CitationType } from "@/types";

function citationLocation(citation: CitationType): string | null {
  if (citation.page) return `Page ${citation.page}`;
  if (citation.heading) return citation.heading;
  if (citation.section) return citation.section;
  if (citation.slideNumber) return `Slide ${citation.slideNumber}`;
  if (citation.startTimeSeconds != null) {
    const minutes = Math.floor(citation.startTimeSeconds / 60);
    const seconds = Math.floor(citation.startTimeSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
  return null;
}

export function CitationChip({ citation }: { citation: CitationType }) {
  const location = citationLocation(citation);

  return (
    <Attachment size="xs" orientation="horizontal" className="max-w-56">
      <AttachmentMedia>
        <FileText className="size-3.5 text-muted-foreground" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle className="truncate">{citation.sourceTitle}</AttachmentTitle>
        {location && <AttachmentDescription>{location}</AttachmentDescription>}
      </AttachmentContent>
    </Attachment>
  );
}

export function CitationList({ citations }: { citations: CitationType[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {citations.map((citation, index) => (
        <CitationChip key={`${citation.chunkId}-${index}`} citation={citation} />
      ))}
    </div>
  );
}