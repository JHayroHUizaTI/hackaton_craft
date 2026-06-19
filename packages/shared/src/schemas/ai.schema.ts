import { z } from "zod";

// ── Clasificación del mensaje (salida estructurada) ─────────
export const sentimentValues = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof sentimentValues)[number];

export const urgencyValues = ["low", "medium", "high"] as const;
export type Urgency = (typeof urgencyValues)[number];

export const classificationSchema = z.object({
  intent: z.string(), // p.ej. "consulta_precio", "soporte", "agendar"
  sentiment: z.enum(sentimentValues),
  urgency: z.enum(urgencyValues),
  requiresHuman: z.boolean(),
});
export type Classification = z.infer<typeof classificationSchema>;

// Resultado de pedirle al agente IA una sugerencia (modo copilot).
export const aiSuggestionSchema = z.object({
  runId: z.string(),
  suggestion: z.string().nullable(), // texto propuesto para enviar (editable)
  classification: classificationSchema.nullable(),
  escalate: z.boolean(), // la IA recomienda pasar a un humano
  escalationReason: z.string().nullable(),
  windowOpen: z.boolean(), // si está cerrada, no se puede enviar texto libre
  model: z.string(),
  provider: z.string(), // "anthropic" | "fake"
  toolsUsed: z.array(z.string()),
});
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

// ── Playground: probar el agente IA sin enviar nada ──────────
export const playgroundTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type PlaygroundTurn = z.infer<typeof playgroundTurnSchema>;

export const playgroundRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  botId: z.string().optional(), // bot a probar; si falta, usa el por defecto
  // Historial de la conversación de prueba (sin contar el mensaje actual).
  history: z.array(playgroundTurnSchema).max(40).default([]),
});
export type PlaygroundRequest = z.infer<typeof playgroundRequestSchema>;

export const playgroundReplySchema = z.object({
  reply: z.string().nullable(),
  escalate: z.boolean(),
  escalationReason: z.string().nullable(),
  model: z.string(),
  provider: z.string(),
  toolsUsed: z.array(z.string()),
  inputTokens: z.number(),
  outputTokens: z.number(),
  costUsd: z.number(),
});
export type PlaygroundReply = z.infer<typeof playgroundReplySchema>;
