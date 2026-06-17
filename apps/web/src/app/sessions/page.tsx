import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { SessionsManager } from "@/features/sessions/SessionsManager";

export default async function SessionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="sessions">
      <SessionsManager />
    </AppShell>
  );
}
