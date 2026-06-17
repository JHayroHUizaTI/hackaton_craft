import type { LlmTool } from "./llm.types";

// Catálogo de herramientas que el agente IA puede usar.
export const TOOL_REGISTRY: Record<string, LlmTool> = {
  search_contact: {
    name: "search_contact",
    description:
      "Devuelve la información del contacto de esta conversación (nombre, teléfono, opt-in, último mensaje). Úsala si necesitas datos del cliente.",
    input_schema: { type: "object", properties: {} },
  },
  search_knowledge: {
    name: "search_knowledge",
    description:
      "Busca en la base de conocimiento del negocio (precios, políticas, FAQs). Úsala para responder con información verificada en vez de inventar.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Qué buscar" },
      },
      required: ["query"],
    },
  },
  handoff_to_human: {
    name: "handoff_to_human",
    description:
      "Escala la conversación a un agente humano. Úsala si no estás seguro, el cliente está molesto, o el tema excede tu alcance.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo del escalado" },
      },
      required: ["reason"],
    },
  },
};

export function availableTools(): { name: string; description: string }[] {
  return Object.values(TOOL_REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
  }));
}

export function resolveTools(enabled: string[]): LlmTool[] {
  return enabled
    .map((name) => TOOL_REGISTRY[name])
    .filter((t): t is LlmTool => !!t);
}
