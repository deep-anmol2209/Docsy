
import { Skeleton } from "@/components/ui/skeleton";

export function ArtifactGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/60 bg-card p-5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="mt-4 h-3 w-1/3 rounded-md" />
          <Skeleton className="mt-2 h-5 w-3/4 rounded-md" />
          <Skeleton className="mt-2 h-4 w-full rounded-md" />
          <Skeleton className="mt-5 h-3 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}
