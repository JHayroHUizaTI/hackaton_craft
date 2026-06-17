"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowBranch } from "@crm/shared";

const ACTION_LABEL: Record<string, string> = {
  ai: "🤖 Pasar a bot IA",
  handoff: "🙋 Pasar a humano",
  tag: "🏷️ Poner etiqueta",
  move_deal: "📊 Mover en pipeline",
};

const handleStyle = { width: 9, height: 9, background: "#25d366", border: "none" };
const targetStyle = { width: 9, height: 9, background: "#5a6b85", border: "none" };

function shell(selected: boolean, color: string): React.CSSProperties {
  return {
    minWidth: 180,
    maxWidth: 240,
    borderRadius: 10,
    border: `1.5px solid ${selected ? "#25d366" : color}`,
    background: "#0f1726",
    color: "#e6edf6",
    fontSize: 12,
    boxShadow: selected ? "0 0 0 2px rgba(37,211,102,0.25)" : "none",
  };
}

const head: React.CSSProperties = {
  padding: "7px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  fontWeight: 700,
  fontSize: 12,
};

const body: React.CSSProperties = {
  padding: "8px 10px",
  color: "#aebfd6",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export function StartNode({ selected }: NodeProps) {
  return (
    <div style={{ ...shell(!!selected, "#1f6f46"), minWidth: 120 }}>
      <div style={{ ...head, color: "#7ee2a8", borderBottom: "none", textAlign: "center" }}>
        ● Inicio
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function SendMessageNode({ data, selected }: NodeProps) {
  const text = (data as { text?: string }).text;
  return (
    <div style={shell(!!selected, "#2c4b7a")}>
      <Handle type="target" position={Position.Top} style={targetStyle} />
      <div style={{ ...head, color: "#9ec1ff" }}>💬 Enviar mensaje</div>
      <div style={body}>{text || <i style={{ opacity: 0.5 }}>Sin texto…</i>}</div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function AskQuestionNode({ data, selected }: NodeProps) {
  const d = data as { text?: string; variable?: string };
  return (
    <div style={shell(!!selected, "#7a5fb0")}>
      <Handle type="target" position={Position.Top} style={targetStyle} />
      <div style={{ ...head, color: "#cbb6ff" }}>❓ Preguntar y guardar</div>
      <div style={body}>
        {d.text || <i style={{ opacity: 0.5 }}>Sin pregunta…</i>}
        {d.variable && (
          <div style={{ marginTop: 4, color: "#7ee2a8" }}>→ {`{{${d.variable}}}`}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  const branches = ((data as { branches?: FlowBranch[] }).branches ?? []) as FlowBranch[];
  const rowH = 24;
  return (
    <div style={shell(!!selected, "#b08a3f")}>
      <Handle type="target" position={Position.Top} style={targetStyle} />
      <div style={{ ...head, color: "#ffd98a" }}>🔀 Condición</div>
      <div style={{ padding: "6px 10px" }}>
        {branches.length === 0 && (
          <i style={{ opacity: 0.5 }}>Añade ramas en el panel…</i>
        )}
        {branches.map((b) => (
          <div
            key={b.id}
            style={{ position: "relative", height: rowH, display: "flex", alignItems: "center" }}
          >
            <span style={{ fontSize: 11 }}>{b.label || b.keywords.join(", ") || "rama"}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={b.id}
              style={{ ...handleStyle, top: rowH / 2 }}
            />
          </div>
        ))}
        <div style={{ position: "relative", height: rowH, display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#8aa0bd" }}>en otro caso</span>
          <Handle
            type="source"
            position={Position.Right}
            id="else"
            style={{ ...handleStyle, background: "#5a6b85", top: rowH / 2 }}
          />
        </div>
      </div>
    </div>
  );
}

export function ActionNode({ data, selected }: NodeProps) {
  const d = data as { action?: string; tag?: string };
  const label = d.action ? ACTION_LABEL[d.action] ?? d.action : "Sin acción";
  return (
    <div style={shell(!!selected, "#3f8c6e")}>
      <Handle type="target" position={Position.Top} style={targetStyle} />
      <div style={{ ...head, color: "#8fe6c0" }}>⚡ Acción</div>
      <div style={body}>
        {label}
        {d.action === "tag" && d.tag ? ` · ${d.tag}` : ""}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

export const nodeTypes = {
  start: StartNode,
  sendMessage: SendMessageNode,
  askQuestion: AskQuestionNode,
  condition: ConditionNode,
  action: ActionNode,
};
