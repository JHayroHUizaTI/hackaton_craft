import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { WhatsAppConnect } from "@/features/whatsapp/WhatsAppConnect";

export default async function WhatsAppPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="whatsapp">
      <WhatsAppConnect />
    </AppShell>
  );
}
