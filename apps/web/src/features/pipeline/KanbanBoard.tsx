"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DealDto, PipelineDto } from "@crm/shared";
import {
  createDeal,
  fetchContacts,
  fetchPipeline,
  moveDeal,
} from "@/lib/bff";
import { useRealtime } from "@/hooks/useRealtime";

function money(value: number | null, currency: string): string {
  if (value === null) return "";
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency }).format(
      value,
    );
  } catch {
    return `${value} ${currency}`;
  }
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const { connected } = useRealtime({
    "pipeline.changed": () =>
      queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["pipeline"],
    queryFn: fetchPipeline,
  });

  const move = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      moveDeal(dealId, stageId),
    // Actualización optimista: mover la tarjeta de inmediato.
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const prev = queryClient.getQueryData<PipelineDto>(["pipeline"]);
      if (prev) {
        queryClient.setQueryData<PipelineDto>(["pipeline"], {
          ...prev,
          deals: prev.deals.map((d) =>
            d.id === dealId ? { ...d, stageId } : d,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["pipeline"], ctx.prev);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealDto[]>();
    for (const d of data?.deals ?? []) {
      const list = map.get(d.stageId) ?? [];
      list.push(d);
      map.set(d.stageId, list);
    }
    return map;
  }, [data]);

  if (isPending) return <PipelineSkeleton />;
  if (isError)
    return (
      <PipelineError message={(error as Error).message} onRetry={() => refetch()} />
    );
  if (!data) return <PipelineSkeleton />;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Pipeline</h2>
        <span
          title={connected ? "En tiempo real" : "Desconectado"}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "var(--accent)" : "#7a8aa0",
          }}
        />
        <div style={{ flex: 1 }} />
        <NewDealForm
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["pipeline"] })
          }
        />
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {data.stages.map((stage) => {
          const deals = dealsByStage.get(stage.id) ?? [];
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dealId = e.dataTransfer.getData("text/plain");
                const deal = data.deals.find((d) => d.id === dealId);
                if (dealId && deal && deal.stageId !== stage.id) {
                  move.mutate({ dealId, stageId: stage.id });
                }
              }}
              style={column}
            >
              <div style={columnHeader}>
                <span>{stage.name}</span>
                <span style={{ color: "var(--muted)" }}>{deals.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", deal.id)
                    }
                    style={card}
                  >
                    <strong style={{ fontSize: 14 }}>{deal.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                      {deal.contact.name ?? deal.contact.phone}
                    </div>
                    {deal.value !== null && (
                      <div style={{ color: "var(--accent)", fontSize: 13, marginTop: 4 }}>
                        {money(deal.value, deal.currency)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <h2 style={{ margin: 0 }}>Pipeline</h2>
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 10,
          background: "#2a2113",
          border: "1px solid #5a4a2a",
          color: "#e0b766",
          fontSize: 14,
        }}
      >
        No se pudo cargar el tablero: {message}
      </div>
      <button onClick={onRetry} style={primaryBtn}>
        Reintentar
      </button>
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Pipeline</h2>
        <div className="spinner" aria-label="Cargando" />
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Cargando tablero…</span>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "hidden" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={column}>
            <div
              className="skeleton"
              style={{ height: 16, width: "55%", marginBottom: 12 }}
            />
            {Array.from({ length: (i % 3) + 1 }).map((__, j) => (
              <div
                key={j}
                className="skeleton"
                style={{ height: 62, marginBottom: 8, opacity: 0.85 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewDealForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => fetchContacts(),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      createDeal({
        contactId,
        title: title.trim(),
        value: value ? Number(value) : undefined,
        currency: "USD",
      }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setValue("");
      setContactId("");
      onCreated();
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={primaryBtn}>
        + Nuevo deal
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (contactId && title.trim()) create.mutate();
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
    >
      <select
        value={contactId}
        onChange={(e) => setContactId(e.target.value)}
        required
        style={field}
      >
        <option value="">Contacto…</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ?? c.phone}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        required
        style={field}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor"
        type="number"
        min="0"
        style={{ ...field, width: 90 }}
      />
      <button type="submit" disabled={create.isPending} style={primaryBtn}>
        Crear
      </button>
      <button type="button" onClick={() => setOpen(false)} style={ghostBtn}>
        Cancelar
      </button>
      {contacts.length === 0 && (
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          (sin contactos: recibe un mensaje primero)
        </span>
      )}
    </form>
  );
}

const column: React.CSSProperties = {
  width: 260,
  flexShrink: 0,
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
  minHeight: 200,
};

const columnHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 10,
};

const card: React.CSSProperties = {
  background: "#1c2738",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  cursor: "grab",
};

const field: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#04210f",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
};
