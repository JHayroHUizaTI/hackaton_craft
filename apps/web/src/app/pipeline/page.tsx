import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopNav } from "@/components/TopNav";
import { KanbanBoard } from "@/features/pipeline/KanbanBoard";

export default async function PipelinePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <>
      <TopNav email={session.user?.email ?? ""} role={role} active="pipeline" />
      <KanbanBoard />
    </>
  );
}
