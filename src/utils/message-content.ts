/**
 * `Message.content` is stored as Json to stay extensible (attachments,
 * structured parts, etc. later), but today every message is written as
 * `{ text: string }`. This is the single place that unwraps it, so the
 * shape only has to change in one spot later.
 */
export function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;

  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text ?? "");
  }

  return "";
}