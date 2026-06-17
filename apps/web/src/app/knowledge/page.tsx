import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopNav } from "@/components/TopNav";
import { KnowledgeManager } from "@/features/knowledge/KnowledgeManager";

export default async function KnowledgePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <>
      <TopNav email={session.user?.email ?? ""} role={role} active="knowledge" />
      <KnowledgeManager />
    </>
  );
}
