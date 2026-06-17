import { z } from "zod";

// ── DTOs de salida ──────────────────────────────────────────
export const stageDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  isWon: z.boolean(),
  isLost: z.boolean(),
});
export type StageDto = z.infer<typeof stageDtoSchema>;

export const dealDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number().nullable(),
  currency: z.string(),
  stageId: z.string(),
  contact: z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string(),
  }),
  createdAt: z.string(),
});
export type DealDto = z.infer<typeof dealDtoSchema>;

export const pipelineDtoSchema = z.object({
  stages: z.array(stageDtoSchema),
  deals: z.array(dealDtoSchema),
});
export type PipelineDto = z.infer<typeof pipelineDtoSchema>;

// ── Entradas ────────────────────────────────────────────────
export const createDealSchema = z.object({
  contactId: z.string(),
  title: z.string().min(1).max(160),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  stageId: z.string().optional(), // por defecto, la primera etapa
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  value: z.number().nonnegative().nullable().optional(),
});
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const moveDealSchema = z.object({
  stageId: z.string(),
});
export type MoveDealInput = z.infer<typeof moveDealSchema>;

// ── Contacto (para el selector al crear un deal) ────────────
export const contactDtoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string(),
});
export type ContactDto = z.infer<typeof contactDtoSchema>;
