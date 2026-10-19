// "use client";

// import Link from "next/link";
// import { FileStack, CheckCircle2, Loader2, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
// import { Card } from "@/components/ui/card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { SourceCard } from "@/components/sources/source-card";
// import { EmptyState } from "@/components/shared/empty-state";
// import { useWorkspace } from "@/hooks/useWorkspace";
// import { useSources } from "@/hooks/useSource";

// function StatCard({
//   icon: Icon,
//   label,
//   value,
//   isLoading,
// }: {
//   icon: typeof FileStack;
//   label: string;
//   value: number;
//   isLoading: boolean;
// }) {
//   return (
//     <Card className="p-4">
//       <div className="flex items-center gap-2 text-muted-foreground">
//         <Icon className="size-4" />
//         <span className="text-xs font-medium">{label}</span>
//       </div>
//       {isLoading ? (
//         <Skeleton className="mt-2 h-7 w-10 rounded-md" />
//       ) : (
//         <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
//       )}
//     </Card>
//   );
// }

// export function NotebookOverview({ notebookId }: { notebookId: string }) {
//   const { workspace, isLoading: workspaceLoading } = useWorkspace(notebookId);
//   const { sources, isLoading: sourcesLoading, deleteSource, retrySource } = useSources(notebookId);
// console.log(sources);

//   const readyCount = sources.filter((s) => s.ingestionStatus === "COMPLETED").length;
//   const processingCount = sources.filter(
//     (s) => s.ingestionStatus !== "COMPLETED" && s.ingestionStatus !== "FAILED",
//   ).length;

//   return (
//     <div className="space-y-8 px-6 py-6 md:px-10">
//       <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//         <StatCard icon={FileStack} label="Sources" value={workspace?._count?.sources ?? 0} isLoading={workspaceLoading} />
//         <StatCard icon={CheckCircle2} label="Ready" value={readyCount} isLoading={sourcesLoading} />
//         <StatCard icon={Loader2} label="Processing" value={processingCount} isLoading={sourcesLoading} />
//         <StatCard icon={Sparkles} label="Artifacts" value={workspace?._count?.artifacts ?? 0} isLoading={workspaceLoading} />
//       </div>

//       <section className="space-y-4">
//         <div className="flex items-center justify-between">
//           <h2 className="text-sm font-medium text-muted-foreground">Recent sources</h2>
//           <Link
//             href={`/notebooks/${notebookId}/sources`}
//             className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
//           >
//             View all
//             <ArrowRight className="size-3" />
//           </Link>
//         </div>

//         {sources.length === 0 && !sourcesLoading ? (
//           <EmptyState
//             icon={<FileStack />}
//             title="No sources yet"
//             description="Add a source to start building this notebook's knowledge base."
//           />
//         ) : (
//           <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//             {sources.slice(0, 4).map((source) => (
//               <SourceCard key={source.id} source={source} onDelete={async(id)=>{deleteSource.mutateAsync(id)}} onRetry={async(id)=>{
//                 retrySource.mutateAsync(id)
//               }} />
//             ))}
//           </div>
//         )}
//       </section>

//       <section className="space-y-4">
//         <div className="flex items-center justify-between">
//           <h2 className="text-sm font-medium text-muted-foreground">Chat with this notebook</h2>
//         </div>
//         <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex items-center gap-3">
//             <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
//               <MessageSquare className="size-4" />
//             </span>
//             <div>
//               <p className="text-sm font-medium">Ask anything about your sources</p>
//               <p className="text-xs text-muted-foreground">
//                 {readyCount > 0
//                   ? `${readyCount} source${readyCount === 1 ? "" : "s"} ready to search`
//                   : "Add a source to start chatting"}
//               </p>
//             </div>
//           </div>
//           <Link
//             href={`/notebooks/${notebookId}/chat`}
//             className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
//           >
//             Open chat
//             <ArrowRight className="size-3.5" />
//           </Link>
//         </Card>
//       </section>
//     </div>
//   );
// }

"use client";

import Link from "next/link";
import { FileStack, CheckCircle2, Loader2, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceCard } from "@/components/sources/source-card";
import { ArtifactCard } from "@/components/artifacts/artifacts-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useSources } from "@/hooks/useSource";
import { useArtifacts } from "@/hooks/useArtifact";

function StatCard({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: typeof FileStack;
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-10 rounded-md" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
    </Card>
  );
}

export function NotebookOverview({ notebookId }: { notebookId: string }) {
  const { workspace, isLoading: workspaceLoading } = useWorkspace(notebookId);
  const { sources, isLoading: sourcesLoading, deleteSource, retrySource } = useSources(notebookId);
  const { artifacts, isLoading: artifactsLoading, deleteArtifact, togglePin } = useArtifacts(notebookId);

  const readyCount = sources.filter((s) => s.ingestionStatus === "COMPLETED").length;
  const processingCount = sources.filter(
    (s) => s.ingestionStatus !== "COMPLETED" && s.ingestionStatus !== "FAILED",
  ).length;

  console.log("[SOURCE UI] [NotebookOverview] Ready filter -> Before sources:", sources.map(s => ({ id: s.id, status: s.ingestionStatus })), "After count:", readyCount);
  console.log("[SOURCE UI] [NotebookOverview] Processing filter -> Before sources:", sources.map(s => ({ id: s.id, status: s.ingestionStatus })), "After count:", processingCount);

  return (
    <div className="space-y-8 px-6 py-6 md:px-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={FileStack} label="Sources" value={workspace?._count?.sources ?? 0} isLoading={workspaceLoading} />
        <StatCard icon={CheckCircle2} label="Ready" value={readyCount} isLoading={sourcesLoading} />
        <StatCard icon={Loader2} label="Processing" value={processingCount} isLoading={sourcesLoading} />
        <StatCard icon={Sparkles} label="Artifacts" value={workspace?._count?.artifacts ?? 0} isLoading={workspaceLoading} />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent sources</h2>
          <Link
            href={`/notebooks/${notebookId}/sources`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {(() => {
          const isEmpty = sources.length === 0 && !sourcesLoading;
          console.log("[SOURCE UI] [NotebookOverview] Conditional rendering check:", {
            sourcesCount: sources.length,
            sourcesLoading,
            isEmpty,
          });

          if (isEmpty) {
            console.log("[SOURCE UI] [NotebookOverview] Condition matched: Showing 'No sources yet' EmptyState");
            return (
              <EmptyState
                icon={<FileStack />}
                title="No sources yet"
                description="Add a source to start building this notebook's knowledge base."
              />
            );
          }

          console.log("[SOURCE UI] [NotebookOverview] Immediately before rendering source list. Total sources count:", sources.length);
          sources.forEach((s, idx) => {
            console.log(`[SOURCE UI] [NotebookOverview] [${idx}] id: ${s.id} | title: ${s.title} | ingestionStatus: ${s.ingestionStatus}`);
          });

          const slicedSources = sources.slice(0, 4);
          console.log("[SOURCE UI] [NotebookOverview] slice(0, 4) -> Before IDs:", sources.map(s => s.id), "After IDs:", slicedSources.map(s => s.id));

          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slicedSources.map((source) => {
                const cardKey = source.id;
                console.log(`[SOURCE UI] [NotebookOverview] Inside .map() -> id: ${source.id} | title: ${source.title} | key: ${cardKey}`);
                return (
                  <SourceCard
                    key={cardKey}
                    source={source}
                    onDelete={async (id) => {
                      deleteSource.mutateAsync(id);
                    }}
                    onRetry={async (id) => {
                      retrySource.mutateAsync(id);
                    }}
                    isDeleting={deleteSource.isPending}
                    isRetrying={retrySource.isPending}
                  />
                );
              })}
            </div>
          );
        })()}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent artifacts</h2>
          <Link
            href={`/notebooks/${notebookId}/artifacts`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {artifacts.length === 0 && !artifactsLoading ? (
          <EmptyState
            icon={<Sparkles />}
            title="No artifacts yet"
            description="Ask for a summary, study guide, or quiz from chat to generate one."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {artifacts.slice(0, 4).map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                workspaceId={notebookId}
                artifact={artifact}
                onDelete={deleteArtifact}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Chat with this notebook</h2>
        </div>
        <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Ask anything about your sources</p>
              <p className="text-xs text-muted-foreground">
                {readyCount > 0
                  ? `${readyCount} source${readyCount === 1 ? "" : "s"} ready to search`
                  : "Add a source to start chatting"}
              </p>
            </div>
          </div>
          <Link
            href={`/notebooks/${notebookId}/chat`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open chat
            <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </section>
    </div>
  );
}