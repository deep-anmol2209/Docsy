
import { Streamdown } from "streamdown";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { BrandMark } from "@/components/shared/brand-mark";
import { Spinner } from "@/components/ui/spinner";

export function StreamingMessage({ text }: { text: string }) {
  return (
    <Message align="start">
      <MessageAvatar>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BrandMark className="size-3.5" />
        </span>
      </MessageAvatar>
      <MessageContent>
        <Bubble align="start" variant="muted">
          <BubbleContent>
            {text ? (
              <Streamdown>{text}</Streamdown>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Spinner className="size-3.5" />
                Thinking...
              </span>
            )}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

