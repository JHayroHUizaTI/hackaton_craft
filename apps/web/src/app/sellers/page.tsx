import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { SellersManager } from "@/features/sellers/SellersManager";

export default async function SellersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;
  if (role !== "ADMIN") redirect("/");

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="sellers">
      <SellersManager />
    </AppShell>
  );
}
