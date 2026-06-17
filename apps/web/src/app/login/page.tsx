import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  }

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <form action={login} style={card}>
        <h1 style={{ marginTop: 0 }}>CRM Prime</h1>
        <p style={{ color: "var(--muted)", marginTop: -8 }}>Inicia sesión</p>

        {error && (
          <p style={{ color: "#ff6b6b" }}>Credenciales inválidas.</p>
        )}

        <label style={label}>Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue="admin@crm.local"
          style={input}
        />

        <label style={label}>Contraseña</label>
        <input name="password" type="password" required style={input} />

        <button type="submit" style={btn}>
          Entrar
        </button>
      </form>
    </main>
  );
}

const card: React.CSSProperties = {
  width: 360,
  padding: 28,
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
};

const label: React.CSSProperties = {
  fontSize: 13,
  color: "var(--muted)",
  marginTop: 14,
  marginBottom: 6,
};

const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
};

const btn: React.CSSProperties = {
  marginTop: 22,
  padding: "11px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#04210f",
  fontWeight: 600,
  cursor: "pointer",
};
