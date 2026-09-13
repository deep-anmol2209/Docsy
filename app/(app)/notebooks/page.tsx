import { AppHeader } from "@/components/layout/app-header";
import { NotebookListView } from "@/components/notebook/notebook-list-view";

export default function NotebooksPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader>
        <span className="text-sm font-medium">Notebooks</span>
      </AppHeader>
      <main className="flex-1 px-6 py-8 md:px-10">
        <NotebookListView />
      </main>
    </div>
  );
}