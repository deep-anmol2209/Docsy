
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateNotebookDialog } from "@/components/notebook/create-notebook-dialog";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(fullName?: string | null): string | null {
  if (!fullName) return null;
  return fullName.trim().split(/\s+/)[0] ?? null;
}

export function DashboardGreeting({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  // Lets the sidebar's "New Notebook" link (which points at /dashboard?create=1)
  // open the dialog directly from any page that renders this component.
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  const name = firstName(userName);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {timeOfDayGreeting()}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue your research or create something new.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Create notebook
        </Button>
      </div>

      <CreateNotebookDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
