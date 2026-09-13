import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isYouTubeUrl(urlStr?: string | null): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    const host = parsed.hostname.toLowerCase();
    return host.endsWith("youtube.com") || host === "youtube.com" || host.endsWith("youtu.be") || host === "youtu.be";
  } catch {
    return false;
  }
}

