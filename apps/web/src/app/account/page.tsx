import { redirect } from "next/navigation";
import type { PublicUser } from "@crm/shared";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { AccountManager } from "@/features/account/AccountManager";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  const me = await apiFetch<PublicUser>("/auth/me");

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="account">
      <AccountManager initial={me} />
    </AppShell>
  );
}
