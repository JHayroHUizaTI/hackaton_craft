import { z } from "zod";

export const effortValues = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof effortValues)[number];

// Reglas de escalado configurables.
export const escalationRulesSchema = z.object({
  minConfidence: z.number().min(0).max(1).optional(),
  escalateOnNegativeSentiment: z.boolean().optional(),
  keywords: z.array(z.string()).optional(),
});
export type EscalationRules = z.infer<typeof escalationRulesSchema>;

// Herramienta disponible (para los checkboxes del panel).
export const agentToolInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type AgentToolInfo = z.infer<typeof agentToolInfoSchema>;

// Configuración del agente que devuelve la API.
export const agentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  effort: z.string(),
  systemPrompt: z.string(),
  enabledTools: z.array(z.string()),
  maxIterations: z.number(),
  escalationRules: escalationRulesSchema,
  monthlyTokenBudget: z.number(),
  availableTools: z.array(agentToolInfoSchema),
});
export type AgentConfigDto = z.infer<typeof agentConfigSchema>;

// Entrada para actualizar (todo opcional).
export const updateAgentConfigSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  model: z.string().min(1).optional(),
  effort: z.enum(effortValues).optional(),
  systemPrompt: z.string().min(1).max(100_000).optional(),
  enabledTools: z.array(z.string()).optional(),
  maxIterations: z.number().int().min(1).max(20).optional(),
  escalationRules: escalationRulesSchema.optional(),
  monthlyTokenBudget: z.number().int().min(0).optional(),
});
export type UpdateAgentConfigInput = z.infer<typeof updateAgentConfigSchema>;
