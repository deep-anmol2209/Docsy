import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      {/* Assistant bubble skeleton */}
      <div className="flex justify-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-80 rounded-2xl rounded-tl-none" />
          <Skeleton className="h-3 w-40 rounded-md" />
        </div>
      </div>

      {/* User bubble skeleton */}
      <div className="flex justify-end gap-3">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 rounded-2xl rounded-tr-none" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-full" />
      </div>

      {/* Assistant bubble skeleton */}
      <div className="flex justify-start gap-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-96 rounded-2xl rounded-tl-none" />
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>
      </div>
    </div>
  );
}
