"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SellerDto, SourceDto } from "@crm/shared";
import {
  assignSellerSources,
  createSource,
  deleteSource,
  fetchSellers,
} from "@/lib/bff";

export function SellersManager() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["sellers"],
    queryFn: fetchSellers,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sellers"] });

  const sources = data?.sources ?? [];
  const sellers = data?.sellers ?? [];

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
      {isPending && <p style={muted}>Cargando…</p>}
      {isError && <p style={{ color: "#ff6b6b" }}>{(error as Error).message}</p>}

      {/* Fuentes */}
      <section>
        <h3 style={{ margin: "0 0 4px" }}>Fuentes</h3>
        <p style={{ ...muted, marginTop: 0 }}>
          El origen de tus leads (Facebook Ads, Instagram, Web, Referido…). Luego
          asignas cada fuente a uno o varios vendedores.
        </p>
        <SourcesEditor sources={sources} onChanged={refresh} />
      </section>

      {/* Vendedores */}
      <section>
        <h3 style={{ margin: "0 0 4px" }}>Vendedores y sus fuentes</h3>
        <p style={{ ...muted, marginTop: 0 }}>
          Cada vendedor verá en su bandeja <strong>solo</strong> las
          conversaciones de los contactos de las fuentes que marques. Los
          administradores ven todo.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sellers.map((s) => (
            <SellerRow key={s.id} seller={s} sources={sources} onSaved={refresh} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SourcesEditor({
  sources,
  onChanged,
}: {
  sources: SourceDto[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2c4b7a");

  const create = useMutation({
    mutationFn: () => createSource({ name: name.trim(), color }),
    onSuccess: () => {
      setName("");
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: deleteSource,
    onSuccess: onChanged,
  });

  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {sources.map((s) => (
          <span key={s.id} style={chip(s.color)}>
            {s.name}
            <span style={{ opacity: 0.7 }}> · {s.contactCount}</span>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar la fuente "${s.name}"?`)) remove.mutate(s.id);
              }}
              style={chipX}
              title="Eliminar"
            >
              ✕
            </button>
          </span>
        ))}
        {sources.length === 0 && <span style={muted}>Aún no hay fuentes.</span>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 38, height: 38, padding: 0, border: "none", background: "none", cursor: "pointer" }}
          title="Color"
        />
        <input
          style={input}
          value={name}
          placeholder="Nueva fuente (ej. Facebook Ads)"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) create.mutate();
          }}
        />
        <button
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending}
          style={primaryBtn}
        >
          Añadir
        </button>
      </div>
    </div>
  );
}

function SellerRow({
  seller,
  sources,
  onSaved,
}: {
  seller: SellerDto;
  sources: SourceDto[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(seller.sourceIds);
  const dirty =
    selected.length !== seller.sourceIds.length ||
    selected.some((id) => !seller.sourceIds.includes(id));

  const save = useMutation({
    mutationFn: () => assignSellerSources(seller.id, selected),
    onSuccess: onSaved,
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const isAdmin = seller.role === "ADMIN";

  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={avatar}>{(seller.name ?? seller.email)[0]?.toUpperCase()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{seller.name ?? seller.email}</strong>
          <div style={{ ...muted, fontSize: 12 }}>
            {seller.email} · {seller.role}
          </div>
        </div>
        {dirty && !isAdmin && (
          <button onClick={() => save.mutate()} disabled={save.isPending} style={primaryBtn}>
            {save.isPending ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
      {isAdmin ? (
        <p style={{ ...muted, fontSize: 13, margin: "10px 0 0" }}>
          Es administrador: ve todas las conversaciones sin importar la fuente.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {sources.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  ...chip(on ? s.color : null),
                  opacity: on ? 1 : 0.45,
                  cursor: "pointer",
                  border: on ? "1px solid transparent" : "1px solid var(--border)",
                  background: on ? chip(s.color).background : "transparent",
                }}
              >
                {s.name}
              </button>
            );
          })}
          {sources.length === 0 && <span style={muted}>Crea fuentes primero.</span>}
        </div>
      )}
    </div>
  );
}

const box: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const muted: React.CSSProperties = { color: "var(--muted)", fontSize: 14 };

const input: React.CSSProperties = {
  flex: 1,
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#04210f",
  fontWeight: 600,
  cursor: "pointer",
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
};

function chip(color: string | null): React.CSSProperties {
  const bg =
    color && /^#?[0-9a-fA-F]{3,8}$/.test(color)
      ? color.startsWith("#")
        ? color
        : `#${color}`
      : "#2c4b7a";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: "#eaf2ff",
  };
}

const chipX: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#eaf2ff",
  cursor: "pointer",
  fontSize: 11,
  opacity: 0.8,
  padding: 0,
};
