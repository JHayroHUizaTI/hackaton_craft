import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ContactsManager } from "@/features/contacts/ContactsManager";

export default async function ContactsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="contacts">
      <ContactsManager />
    </AppShell>
  );
}
