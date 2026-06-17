import { z } from "zod";

// Tipos de nodo del constructor visual.
export const flowNodeTypes = [
  "start",
  "sendMessage",
  "askQuestion",
  "condition",
  "action",
  "delay",
  "http",
  "assign",
  "jumpToFlow",
] as const;
export type FlowNodeType = (typeof flowNodeTypes)[number];

export const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof httpMethods)[number];

export const delayUnits = ["minutes", "hours"] as const;
export type DelayUnit = (typeof delayUnits)[number];

// Acciones del nodo "action".
export const flowActionTypes = ["ai", "handoff", "tag", "move_deal"] as const;
export type FlowActionType = (typeof flowActionTypes)[number];

// Rama del nodo "condition" (cada una es un sourceHandle de salida).
export const flowBranchSchema = z.object({
  id: z.string(),
  label: z.string(),
  keywords: z.array(z.string()),
});
export type FlowBranch = z.infer<typeof flowBranchSchema>;

// data del nodo: flexible pero acotado por campos conocidos.
export const flowNodeDataSchema = z.object({
  // sendMessage / askQuestion
  text: z.string().optional(),
  // askQuestion: variable donde guardar la respuesta
  variable: z.string().optional(),
  // condition
  branches: z.array(flowBranchSchema).optional(),
  // action
  action: z.enum(flowActionTypes).optional(),
  botId: z.string().nullable().optional(),
  tag: z.string().optional(),
  stageId: z.string().optional(),
  // delay: esperar antes de continuar
  delayValue: z.number().optional(),
  delayUnit: z.enum(delayUnits).optional(),
  // http: petición a una API/webhook externa
  method: z.enum(httpMethods).optional(),
  url: z.string().optional(),
  headers: z.string().optional(), // JSON crudo: { "Authorization": "..." }
  httpBody: z.string().optional(), // cuerpo (admite {{variables}})
  saveAs: z.string().optional(), // variable donde guardar la respuesta
  // assign: asignar a un agente
  agentId: z.string().nullable().optional(),
  agentName: z.string().optional(), // solo para mostrar en el lienzo
  // jumpToFlow: continuar en otro flujo
  flowId: z.string().optional(),
  flowName: z.string().optional(), // solo para mostrar en el lienzo
});
export type FlowNodeData = z.infer<typeof flowNodeDataSchema>;

export const flowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(flowNodeTypes),
  position: z.object({ x: z.number(), y: z.number() }),
  data: flowNodeDataSchema,
});
export type FlowNode = z.infer<typeof flowNodeSchema>;

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  label: z.string().optional(),
});
export type FlowEdge = z.infer<typeof flowEdgeSchema>;

export const flowTriggerTypes = ["conversation_start", "keyword"] as const;
export type FlowTriggerType = (typeof flowTriggerTypes)[number];

// Referencia ligera a un canal (para el selector de disparador).
export const flowChannelRefSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  displayPhoneNumber: z.string().nullable(),
});
export type FlowChannelRef = z.infer<typeof flowChannelRefSchema>;

// Referencia ligera a un bot (para el nodo action="ai").
export const flowBotRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type FlowBotRef = z.infer<typeof flowBotRefSchema>;

// Referencia ligera a un agente (usuario) para el nodo "assign".
export const flowAgentRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});
export type FlowAgentRef = z.infer<typeof flowAgentRefSchema>;

// Flujo completo que devuelve la API.
export const flowSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  channelId: z.string().nullable(),
  channel: flowChannelRefSchema.nullable(),
  triggerType: z.enum(flowTriggerTypes),
  triggerKeywords: z.array(z.string()),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FlowDto = z.infer<typeof flowSchema>;

// Resumen para la lista (también sirve de selector en "saltar a flujo").
export const flowSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  triggerType: z.enum(flowTriggerTypes),
  channel: flowChannelRefSchema.nullable(),
  nodeCount: z.number(),
  updatedAt: z.string(),
});
export type FlowSummary = z.infer<typeof flowSummarySchema>;

// Respuesta de lista: flujos + canales + bots + agentes.
export const flowsResponseSchema = z.object({
  flows: z.array(flowSummarySchema),
  channels: z.array(flowChannelRefSchema),
  bots: z.array(flowBotRefSchema),
  agents: z.array(flowAgentRefSchema),
});
export type FlowsResponse = z.infer<typeof flowsResponseSchema>;

const flowFields = {
  name: z.string().min(1).max(120),
  isActive: z.boolean(),
  channelId: z.string().nullable(),
  triggerType: z.enum(flowTriggerTypes),
  triggerKeywords: z.array(z.string()),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
};

export const createFlowSchema = z.object({
  name: flowFields.name,
  isActive: flowFields.isActive.default(false),
  channelId: flowFields.channelId.default(null),
  triggerType: flowFields.triggerType.default("conversation_start"),
  triggerKeywords: flowFields.triggerKeywords.default([]),
  nodes: flowFields.nodes.default([]),
  edges: flowFields.edges.default([]),
});
export type CreateFlowInput = z.infer<typeof createFlowSchema>;

export const updateFlowSchema = z.object({
  name: flowFields.name.optional(),
  isActive: flowFields.isActive.optional(),
  channelId: flowFields.channelId.optional(),
  triggerType: flowFields.triggerType.optional(),
  triggerKeywords: flowFields.triggerKeywords.optional(),
  nodes: flowFields.nodes.optional(),
  edges: flowFields.edges.optional(),
});
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;
