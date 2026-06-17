"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionDto } from "@crm/shared";
import { fetchSessions, revokeSession } from "@/lib/bff";

const PLATFORM_LABEL: Record<string, string> = {
  WEB: "Navegador web",
  IOS: "iPhone / iPad",
  ANDROID: "Android",
};

export function SessionsManager() {
  const queryClient = useQueryClient();
  const { data: sessions, isPending, isError, error } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: fetchSessions,
  });

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["sessions-list"] }),
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Dispositivos y navegadores donde tu cuenta está abierta. Si no reconoces
        uno, ciérralo: su sesión se revoca al instante.
      </p>

      {isPending && <p style={{ color: "var(--muted)" }}>Cargando…</p>}
      {isError && <p style={{ color: "#ff6b6b" }}>{(error as Error).message}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(sessions ?? []).map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            revoking={revoke.isPending && revoke.variables === s.id}
            onRevoke={() => revoke.mutate(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session: s,
  revoking,
  onRevoke,
}: {
  session: SessionDto;
  revoking: boolean;
  onRevoke: () => void;
}) {
  return (
    <div style={row}>
      <span style={dot(s.current ? "#25d366" : "#7a8aa0")} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>{s.deviceName || PLATFORM_LABEL[s.platform] || s.platform}</strong>
          {s.current && <span style={badge}>Este dispositivo</span>}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
          {PLATFORM_LABEL[s.platform] ?? s.platform}
          {s.ipAddress ? ` · ${s.ipAddress}` : ""}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
          Última actividad: {new Date(s.lastUsedAt).toLocaleString("es")}
        </div>
      </div>
      {!s.current && (
        <button onClick={onRevoke} disabled={revoking} style={ghostBtn}>
          {revoking ? "Cerrando…" : "Cerrar sesión"}
        </button>
      )}
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--panel)",
};

const badge: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#1f6f46",
  color: "#eafff3",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #5a2a2a",
  background: "transparent",
  color: "#e08a8a",
  cursor: "pointer",
  fontSize: 13,
  whiteSpace: "nowrap",
};

function dot(color: string): React.CSSProperties {
  return { width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 };
}
