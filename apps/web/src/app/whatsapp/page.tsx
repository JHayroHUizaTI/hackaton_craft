import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopNav } from "@/components/TopNav";
import { WhatsAppConnect } from "@/features/whatsapp/WhatsAppConnect";

export default async function WhatsAppPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <>
      <TopNav email={session.user?.email ?? ""} role={role} active="whatsapp" />
      <WhatsAppConnect />
    </>
  );
}
