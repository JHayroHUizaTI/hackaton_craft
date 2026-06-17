import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopNav } from "@/components/TopNav";
import { Inbox } from "@/features/inbox/Inbox";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <>
      <TopNav email={session.user?.email ?? ""} role={role} active="inbox" />
      <Inbox />
    </>
  );
}
