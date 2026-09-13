"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { ChatMessageItem } from "@/components/chat/chat-message";
import { StreamingMessage } from "@/components/chat/streaming-message";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatSkeleton } from "@/components/chat/chat-skeleton";
import { ChatInput } from "@/components/chat/chat-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useConversations } from "@/hooks/useConversation";
import { useChat } from "@/hooks/useChat";
import { ApiClientError } from "@/lib/api-client";
import type { Conversation } from "@/types";

function conversationLabel(title: string | null | undefined, createdAt: string): string {
  if (title) return title;
  return `Chat · ${new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function ChatContainer({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
  } = useConversations(workspaceId);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const cached = queryClient.getQueryData<Conversation[]>(["conversations", workspaceId]);
    return cached?.[0]?.id ?? null;
  });
  const [inputValue, setInputValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isCreatingFirstConversation, setIsCreatingFirstConversation] = useState(false);

  const {
    messages,
    isLoadingHistory,
    streamingText,
    isStreaming,
    sendMessage,
    stopGeneration,
  } = useChat(workspaceId, activeConversationId);

  // Ensures there's always an active conversation once conversations have
  // loaded — selects the most recent one, or creates a fresh one if this
  // notebook has never been chatted with. Keeps the composer free of a
  // "no conversation yet" branch to juggle.
  useEffect(() => {
    if (conversationsLoading || activeConversationId || isCreatingFirstConversation) return;

    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
      return;
    }

    setIsCreatingFirstConversation(true);
    createConversation()
      .then(
        (created) => setActiveConversationId(created.id),
        () => toast.error("Failed to start a chat"),
      )
      .finally(() => {
        setIsCreatingFirstConversation(false);
      });
  }, [conversationsLoading, conversations, activeConversationId, createConversation, isCreatingFirstConversation]);

  const handleNewChat = async () => {
    try {
      const created = await createConversation();
      setActiveConversationId(created.id);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to start a new chat");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteConversation(deleteTargetId);
      if (deleteTargetId === activeConversationId) {
        const remaining = conversations.filter((c) => c.id !== deleteTargetId);
        setActiveConversationId(remaining[0]?.id ?? null);
      }
      toast.success("Chat deleted");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to delete chat");
    }
  };

  const isInitializing = conversationsLoading || !activeConversationId || isCreatingFirstConversation;
  const isChatLoading = isInitializing || isLoadingHistory;
  const isComposerReady = !isChatLoading;
  const hasContent = messages.length > 0 || !!streamingText || isStreaming;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden ">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background px-4 py-2.5 z-10">
        <div className="min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="min-w-0 max-w-full gap-1.5 font-medium" />}
            >
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {activeConversationId
                  ? conversationLabel(
                      conversations.find((c) => c.id === activeConversationId)?.title,
                      conversations.find((c) => c.id === activeConversationId)?.createdAt ?? new Date().toISOString(),
                    )
                  : "Notebook Chat"}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {conversations.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No past chats yet</p>
              )}
              {conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.id}
                  className="justify-between"
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <span className="truncate">{conversationLabel(conversation.title, conversation.createdAt)}</span>
                  {conversation.id === activeConversationId ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  ) : (
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTargetId(conversation.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNewChat}>
                <Plus className="mr-2 size-3.5" />
                New chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleNewChat}>
          <Plus className="size-3.5" />
          New Chat
        </Button>
      </div>

      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="flex-1 min-h-0 overflow-hidden">
          <MessageScrollerViewport className="h-full min-h-0 overflow-y-auto">
            {isChatLoading ? (
              <ChatSkeleton />
            ) : !hasContent ? (
              <ChatEmptyState onSuggestionClick={(text) => sendMessage(text)} />
            ) : (
              <MessageScrollerContent className="mx-auto w-full max-w-4xl px-4 py-6">
                {messages.map((message) => (
                  <MessageScrollerItem key={message.id} className="group/message">
                    <ChatMessageItem message={message} workspaceId={workspaceId} />
                  </MessageScrollerItem>
                ))}

                {isStreaming && (
                  <MessageScrollerItem scrollAnchor>
                    <StreamingMessage text={streamingText ?? ""} />
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            )}
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
<div
className="shrink-0"
>
  <ChatInput

        value={inputValue}
        onValueChange={setInputValue}
        onSend={sendMessage}
        onStop={stopGeneration}
        isStreaming={isStreaming}
        disabled={!isComposerReady}
      /></div>
      

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete this chat?"
        description="This permanently deletes the conversation and its messages. This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConversation}
      />
    </div>
  );
}