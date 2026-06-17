import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { KanbanBoard } from "@/features/pipeline/KanbanBoard";

export default async function PipelinePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="pipeline">
      <KanbanBoard />
    </AppShell>
  );
}
