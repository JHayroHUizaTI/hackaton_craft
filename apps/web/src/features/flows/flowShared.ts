import { createContext } from "react";
import type { FlowNodeData, FlowNodeType } from "@crm/shared";
import type { IconName } from "@/components/NavIcons";

// Catálogo de bloques que se pueden añadir (paleta y menú "+").
export const NODE_PALETTE: { type: FlowNodeType; label: string; icon: IconName }[] = [
  { type: "sendMessage", label: "Enviar mensaje", icon: "message" },
  { type: "askQuestion", label: "Preguntar y guardar", icon: "question" },
  { type: "condition", label: "Condición", icon: "branch" },
  { type: "action", label: "Acción", icon: "bolt" },
  { type: "delay", label: "Esperar", icon: "clock" },
  { type: "http", label: "Petición HTTP", icon: "globe" },
  { type: "assign", label: "Asignar a agente", icon: "user" },
  { type: "jumpToFlow", label: "Ir a otro flujo", icon: "jump" },
];

export function defaultNodeData(type: FlowNodeType): FlowNodeData {
  switch (type) {
    case "sendMessage":
      return { text: "" };
    case "askQuestion":
      return { text: "", variable: "" };
    case "condition":
      return { branches: [] };
    case "action":
      return { action: "ai", botId: null };
    case "delay":
      return { delayValue: 5, delayUnit: "minutes" };
    case "http":
      return { method: "POST", url: "" };
    case "assign":
      return { agentId: null };
    default:
      return {};
  }
}

// Acción que crea un nodo nuevo conectado a la salida de otro (botón "+").
export type AddNextFn = (args: {
  sourceId: string;
  sourceHandle?: string;
  pos: { x: number; y: number };
  type: FlowNodeType;
}) => void;

export interface FlowActions {
  addNext: AddNextFn;
  // Indica si esa salida (nodo + handle) ya tiene una arista saliente.
  isOutgoingTaken: (sourceId: string, sourceHandle?: string) => boolean;
}

export const FlowActionsContext = createContext<FlowActions | null>(null);

// Clave única de una salida (nodo + handle). Handle vacío = salida por defecto.
export function outgoingKey(
  sourceId: string,
  sourceHandle?: string | null,
): string {
  return `${sourceId}::${sourceHandle ?? ""}`;
}
