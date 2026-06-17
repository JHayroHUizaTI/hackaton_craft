import Link from "next/link";
import { signOut } from "@/auth";
import { AgentConfigDrawer } from "@/features/agent/AgentConfigDrawer";

export function TopNav({
  email,
  role,
  active,
}: {
  email: string;
  role?: string;
  active: "inbox" | "pipeline" | "knowledge" | "whatsapp";
}) {
  return (
    <header style={topbar}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <strong>CRM Prime</strong>
        <nav style={{ display: "flex", gap: 6 }}>
          <Link href="/" style={tab(active === "inbox")}>
            Bandeja
          </Link>
          <Link href="/pipeline" style={tab(active === "pipeline")}>
            Pipeline
          </Link>
          <Link href="/knowledge" style={tab(active === "knowledge")}>
            Conocimiento
          </Link>
          <Link href="/whatsapp" style={tab(active === "whatsapp")}>
            WhatsApp
          </Link>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AgentConfigDrawer />
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {email} · {role}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" style={logoutBtn}>
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}

const topbar: React.CSSProperties = {
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  borderBottom: "1px solid var(--border)",
};

function tab(activeTab: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 14,
    textDecoration: "none",
    color: activeTab ? "var(--text)" : "var(--muted)",
    background: activeTab ? "#1b2536" : "transparent",
  };
}

const logoutBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};
