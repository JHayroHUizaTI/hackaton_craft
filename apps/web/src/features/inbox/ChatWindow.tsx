"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AiMode,
  ConversationStatus,
  MessageType,
  type AiSuggestion,
  type ConversationDto,
} from "@crm/shared";
import {
  addNote,
  assignConversation,
  fetchAgents,
  fetchMessages,
  fetchNotes,
  sendMessage,
  setAiMode,
  setConversationStatus,
  suggestReply,
} from "@/lib/bff";

export function ChatWindow({ conversation }: { conversation: ConversationDto }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [ai, setAi] = useState<AiSuggestion | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestMut = useMutation({
    mutationFn: () => suggestReply(conversation.id),
    onSuccess: (s) => {
      setAi(s);
      if (s.suggestion) setText(s.suggestion);
    },
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", conversation.id],
    queryFn: () => fetchMessages(conversation.id),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const invalidateConvs = () =>
    queryClient.invalidateQueries({ queryKey: ["conversations"] });

  const sendMut = useMutation({
    mutationFn: () =>
      sendMessage({
        conversationId: conversation.id,
        type: MessageType.TEXT,
        text: text.trim(),
      }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
      invalidateConvs();
    },
  });

  const assignMut = useMutation({
    mutationFn: (agentId: string | null) =>
      assignConversation(conversation.id, agentId),
    onSuccess: invalidateConvs,
  });

  const statusMut = useMutation({
    mutationFn: (status: ConversationStatus) =>
      setConversationStatus(conversation.id, status),
    onSuccess: invalidateConvs,
  });

  const aiModeMut = useMutation({
    mutationFn: (mode: AiMode) => setAiMode(conversation.id, mode),
    onSuccess: invalidateConvs,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={chatHeader}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <strong>
            {conversation.contact.name ?? conversation.contact.phone}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {conversation.contact.phone}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={conversation.aiMode}
            onChange={(e) => aiModeMut.mutate(e.target.value as AiMode)}
            disabled={aiModeMut.isPending}
            title="Modo del agente IA"
            style={{
              ...control,
              borderColor:
                conversation.aiMode === AiMode.AUTOPILOT
                  ? "#2e7d4f"
                  : conversation.aiMode === AiMode.COPILOT
                    ? "#3a4a6a"
                    : "var(--border)",
            }}
          >
            <option value={AiMode.OFF}>🤖 IA: Off</option>
            <option value={AiMode.COPILOT}>🤖 IA: Copilot</option>
            <option value={AiMode.AUTOPILOT}>🤖 IA: Autopilot</option>
          </select>
          {conversation.aiPaused && (
            <span
              title="La IA está en pausa tras intervención humana"
              style={{ fontSize: 11, color: "#e0a458" }}
            >
              ⏸ IA en pausa
            </span>
          )}
          <select
            value={conversation.assignedAgent?.id ?? ""}
            onChange={(e) => assignMut.mutate(e.target.value || null)}
            disabled={assignMut.isPending}
            title="Asignar a"
            style={control}
          >
            <option value="">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.email}
              </option>
            ))}
          </select>
          <select
            value={conversation.status}
            onChange={(e) =>
              statusMut.mutate(e.target.value as ConversationStatus)
            }
            disabled={statusMut.isPending}
            title="Estado"
            style={control}
          >
            <option value={ConversationStatus.OPEN}>Abierta</option>
            <option value={ConversationStatus.PENDING}>Pendiente</option>
            <option value={ConversationStatus.CLOSED}>Cerrada</option>
          </select>
          <button
            onClick={() => setShowNotes((v) => !v)}
            style={{ ...control, cursor: "pointer" }}
            title="Notas internas"
          >
            Notas
          </button>
        </div>
      </header>

      {showNotes && <NotesPanel conversationId={conversation.id} />}

      <div style={messagesArea}>
        {isLoading && <ChatSkeleton />}
        {messages.map((m) => {
          const out = m.direction === "OUTBOUND";
          return (
            <div
              key={m.id}
              style={{
                alignSelf: out ? "flex-end" : "flex-start",
                background: out ? "#155e3b" : "#1c2738",
                color: "var(--text)",
                padding: "8px 12px",
                borderRadius: 10,
                maxWidth: "70%",
              }}
            >
              <div>{m.content ?? `[${m.type}]`}</div>
              {out && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#9fd9b6",
                    textAlign: "right",
                    marginTop: 2,
                  }}
                >
                  {m.author === "AI" ? "IA · " : ""}
                  {m.status.toLowerCase()}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {ai && (
        <div style={ai.escalate ? aiBannerWarn : aiBanner}>
          {ai.escalate ? (
            <span>
              ⚠️ La IA recomienda <strong>escalar a un humano</strong>
              {ai.escalationReason ? `: ${ai.escalationReason}` : ""}.
            </span>
          ) : (
            <span>
              ✨ Sugerencia de IA cargada en el cuadro — revísala y edítala antes
              de enviar.
            </span>
          )}
          <span style={{ color: "var(--muted)", fontSize: 11 }}>
            {ai.classification && (
              <>
                {ai.classification.intent} · {sentimentLabel(ai.classification.sentiment)}
                {ai.classification.urgency === "high" ? " · 🔴 urgente" : ""} ·{" "}
              </>
            )}
            {ai.provider}/{ai.model}
            {ai.toolsUsed.length ? ` · ${ai.toolsUsed.join(", ")}` : ""}
          </span>
        </div>
      )}

      {conversation.windowOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) sendMut.mutate();
          }}
          style={composer}
        >
          <button
            type="button"
            onClick={() => suggestMut.mutate()}
            disabled={suggestMut.isPending}
            title="Sugerir respuesta con IA (copilot)"
            style={aiBtn}
          >
            {suggestMut.isPending ? "✨…" : "✨ IA"}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensaje…"
            style={input}
          />
          <button type="submit" disabled={sendMut.isPending} style={sendBtn}>
            {sendMut.isPending ? "…" : "Enviar"}
          </button>
        </form>
      ) : (
        <div style={windowClosed}>
          Ventana de 24h cerrada. Solo se pueden enviar plantillas aprobadas
          (Fase 3).
        </div>
      )}
      {sendMut.isError && (
        <div style={{ color: "#ff6b6b", padding: "0 16px 12px", fontSize: 13 }}>
          {(sendMut.error as Error).message}
        </div>
      )}
    </div>
  );
}

function NotesPanel({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", conversationId],
    queryFn: () => fetchNotes(conversationId),
  });

  const add = useMutation({
    mutationFn: () => addNote(conversationId, body.trim()),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["notes", conversationId] });
    },
  });

  return (
    <div style={notesPanel}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        Notas internas (no se envían al contacto)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
        {isLoading && <span style={{ color: "var(--muted)", fontSize: 13 }}>Cargando…</span>}
        {!isLoading && notes.length === 0 && (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Sin notas.</span>
        )}
        {notes.map((n) => (
          <div key={n.id} style={noteItem}>
            <div style={{ fontSize: 13 }}>{n.body}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {n.author.name ?? "Agente"} ·{" "}
              {new Date(n.createdAt).toLocaleString("es")}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate();
        }}
        style={{ display: "flex", gap: 8, marginTop: 8 }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Agregar nota…"
          style={{ ...input, padding: "8px 10px" }}
        />
        <button type="submit" disabled={add.isPending} style={sendBtn}>
          Añadir
        </button>
      </form>
    </div>
  );
}

function sentimentLabel(s: string): string {
  if (s === "negative") return "😟 negativo";
  if (s === "positive") return "🙂 positivo";
  return "😐 neutral";
}

function ChatSkeleton() {
  const rows = [
    { side: "flex-start", w: 180 },
    { side: "flex-end", w: 220 },
    { side: "flex-start", w: 140 },
    { side: "flex-end", w: 200 },
    { side: "flex-start", w: 240 },
  ] as const;
  return (
    <>
      {rows.map((r, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            alignSelf: r.side,
            width: r.w,
            maxWidth: "70%",
            height: 38,
            borderRadius: 10,
            opacity: 0.8,
          }}
        />
      ))}
    </>
  );
}

const chatHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
};

const control: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
  fontSize: 13,
};

const notesPanel: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  background: "#0e1420",
};

const noteItem: React.CSSProperties = {
  background: "#1c2738",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
};

const messagesArea: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const composer: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: 12,
  borderTop: "1px solid var(--border)",
};

const input: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#0d1320",
  color: "var(--text)",
};

const sendBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#04210f",
  fontWeight: 600,
  cursor: "pointer",
};

const windowClosed: React.CSSProperties = {
  padding: 16,
  borderTop: "1px solid var(--border)",
  color: "#e0a458",
  fontSize: 13,
};

const aiBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3a4a6a",
  background: "#16203a",
  color: "#a9c3ff",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const aiBanner: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderTop: "1px solid var(--border)",
  background: "#101a2e",
  color: "#a9c3ff",
  fontSize: 13,
};

const aiBannerWarn: React.CSSProperties = {
  ...aiBanner,
  background: "#2a2113",
  color: "#e0b766",
};
