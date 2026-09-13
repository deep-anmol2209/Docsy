
"use client";

import { useState } from "react";
import { Streamdown } from "streamdown";
import { Copy, Check } from "lucide-react";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandMark } from "@/components/shared/brand-mark";
import { CitationList } from "@/components/chat/citations";
import { authClient } from "@/lib/auth-client";
import type { Message as MessageType } from "@/types";
import { getMessageArtifacts } from "@/lib/message.metadata";
import { ArtifactMessageCard } from "./chat-artifact-card";
function initialsFromName(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ChatMessageItem({ message, workspaceId }: { message: MessageType,workspaceId:string }) {
  const { data: session } = authClient.useSession();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "USER";
  const text = message.content?.text ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
const artifacts = getMessageArtifacts(message.metadata);
const isErrorMessage =
  !isUser &&
  !!message.metadata &&
  typeof message.metadata === "object" &&
  "error" in message.metadata;

  return (
    <Message align={isUser ? "end" : "start"}>
      <MessageAvatar>
        {isUser ? (
          <Avatar size="sm">
            <AvatarImage src={session?.user?.image ?? undefined} alt="" />
            <AvatarFallback className="text-xs">
              {initialsFromName(session?.user?.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BrandMark className="size-3.5" />
          </span>
        )}
      </MessageAvatar>

      <MessageContent>
       <Bubble
  align={isUser ? "end" : "start"}
  variant={isUser ? "default" : "muted"}
>
 <BubbleContent>
  {isErrorMessage ? (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Couldn't generate a response
      </p>

      <p className="text-xs text-muted-foreground">
        {text || "The AI service couldn't complete your request."}
      </p>
    </div>
  ) : isUser ? (
    <p className="whitespace-pre-wrap">{text}</p>
  ) : (
    <Streamdown>{text}</Streamdown>
  )}
</BubbleContent>
</Bubble>

{artifacts.length > 0 && (
  <div className="mt-2 flex flex-col gap-2">
    {artifacts.map((artifact) => (
      <ArtifactMessageCard
        key={artifact.artifactId}
        artifactId={artifact.artifactId}
        workspaceId={workspaceId}
      />
    ))}
  </div>
)}

        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}

        {!isUser && text && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 self-start text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span className="sr-only">Copy response</span>
          </Button>
        )}
      </MessageContent>
    </Message>
  );
}
