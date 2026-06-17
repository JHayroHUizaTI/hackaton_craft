import { z } from "zod";

// Tipos de nodo del constructor visual.
export const flowNodeTypes = [
  "start",
  "sendMessage",
  "askQuestion",
  "condition",
  "action",
] as const;
export type FlowNodeType = (typeof flowNodeTypes)[number];

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

// Resumen para la lista.
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

// Respuesta de lista: flujos + canales + bots disponibles.
export const flowsResponseSchema = z.object({
  flows: z.array(flowSummarySchema),
  channels: z.array(flowChannelRefSchema),
  bots: z.array(flowBotRefSchema),
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
