import { Suspense } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardGreeting } from "@/components/notebook/dashboard-greetings";
import { NotebookGrid } from "@/components/notebook/notebook-grid";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader>
        <span className="text-sm font-medium">Home</span>
      </AppHeader>
      <main className="flex-1 space-y-8 px-6 py-8 md:px-10">
        <Suspense fallback={<div className="h-16" />}>
          <DashboardGreeting userName={session?.user?.name} />
        </Suspense>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Your notebooks</h2>
          <NotebookGrid />
        </section>
      </main>
    </div>
  );
}
