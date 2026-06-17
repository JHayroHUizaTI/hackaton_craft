"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ContactListItem } from "@crm/shared";
import { fetchContactDirectory } from "@/lib/bff";

export function ContactsManager() {
  const [search, setSearch] = useState("");
  const { data: contacts, isPending } = useQuery({
    queryKey: ["contact-directory", search],
    queryFn: () => fetchContactDirectory(search),
  });

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: 24 }}>
      <input
        style={searchInput}
        value={search}
        placeholder="Buscar por nombre o teléfono…"
        onChange={(e) => setSearch(e.target.value)}
      />

      {isPending && <p style={muted}>Cargando…</p>}

      <table style={table}>
        <thead>
          <tr>
            <Th>Contacto</Th>
            <Th>Etiquetas</Th>
            <Th>Fuente</Th>
            <Th>Opt-in</Th>
            <Th>Último mensaje</Th>
          </tr>
        </thead>
        <tbody>
          {(contacts ?? []).map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </tbody>
      </table>
      {contacts && contacts.length === 0 && !isPending && (
        <p style={muted}>No hay contactos.</p>
      )}
    </div>
  );
}

function ContactRow({ contact: c }: { contact: ContactListItem }) {
  return (
    <tr style={tr}>
      <td style={td}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={avatar}>{(c.name ?? c.phone)[0]?.toUpperCase()}</span>
          <div>
            <strong style={{ fontSize: 14 }}>{c.name ?? "(sin nombre)"}</strong>
            <div style={{ ...muted, fontSize: 12 }}>{c.phone}</div>
          </div>
        </div>
      </td>
      <td style={td}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {c.tags.map((t) => (
            <span key={t.name} style={chip(t.color)}>
              {t.name}
            </span>
          ))}
        </div>
      </td>
      <td style={td}>
        {c.source ? <span style={chip(c.source.color)}>{c.source.name}</span> : <span style={muted}>—</span>}
      </td>
      <td style={td}>
        {c.optIn ? (
          <span style={{ color: "#7ee2a8" }}>Sí</span>
        ) : (
          <span style={{ color: "#e08a8a" }}>No</span>
        )}
      </td>
      <td style={td}>
        <span style={{ ...muted, fontSize: 13 }}>
          {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString("es") : "—"}
        </span>
        <Link href="/" style={{ marginLeft: 10, fontSize: 13, color: "var(--accent)" }}>
          Abrir chat
        </Link>
      </td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
      {children}
    </th>
  );
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 18,
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
};

const tr: React.CSSProperties = { borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "12px", fontSize: 14, verticalAlign: "middle" };
const muted: React.CSSProperties = { color: "var(--muted)", fontSize: 14 };

const searchInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
  fontSize: 14,
  boxSizing: "border-box",
};

const avatar: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#22304a",
  color: "#cfe0ff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

function chip(color: string | null): React.CSSProperties {
  const bg =
    color && /^#?[0-9a-fA-F]{3,8}$/.test(color)
      ? color.startsWith("#")
        ? color
        : `#${color}`
      : "#2c4b7a";
  return {
    fontSize: 11,
    padding: "2px 9px",
    borderRadius: 999,
    background: bg,
    color: "#eaf2ff",
  };
}
