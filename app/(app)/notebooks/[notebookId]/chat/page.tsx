
import { ChatContainer } from "@/components/chat/chat-container";

export default async function NotebookChatPage({
  params,
}: {
  params: Promise<{ notebookId: string }>;
}) {
  const { notebookId } = await params;

  return <ChatContainer workspaceId={notebookId} />;
}