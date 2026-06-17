import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ProductsManager } from "@/features/products/ProductsManager";

export default async function ProductsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;

  return (
    <AppShell email={session.user?.email ?? ""} role={role} active="products">
      <ProductsManager isAdmin={role === "ADMIN"} />
    </AppShell>
  );
}
