import { z } from "zod";

// ── Plantillas ───────────────────────────────────────────────
export const templateStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
] as const;
export type TemplateStatusValue = (typeof templateStatuses)[number];

// Variable posicional de la plantilla ({{1}}, {{2}}…).
export const templateVariableSchema = z.object({
  index: z.number().int().min(1),
  label: z.string(),
});
export type TemplateVariable = z.infer<typeof templateVariableSchema>;

export const templateDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  status: z.enum(templateStatuses),
  body: z.string(),
  variables: z.array(templateVariableSchema),
  createdAt: z.string(),
});
export type TemplateDto = z.infer<typeof templateDtoSchema>;

export const createTemplateSchema = z.object({
  // Nombre estilo Meta: minúsculas, números y guiones bajos.
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
  language: z.string().min(2).default("es"),
  body: z.string().min(1).max(1024),
  variables: z.array(templateVariableSchema).default([]),
  status: z.enum(templateStatuses).default("APPROVED"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  language: z.string().min(2).optional(),
  body: z.string().min(1).max(1024).optional(),
  variables: z.array(templateVariableSchema).optional(),
  status: z.enum(templateStatuses).optional(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ── Campañas ─────────────────────────────────────────────────
export const campaignStatuses = [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type CampaignStatusValue = (typeof campaignStatuses)[number];

// Cómo se llena cada variable de la plantilla en la campaña.
export const variableSources = ["static", "contact_name", "contact_phone"] as const;
export type VariableSource = (typeof variableSources)[number];

export const variableValueSchema = z.object({
  index: z.number().int().min(1),
  source: z.enum(variableSources),
  value: z.string().optional(), // si source = static
});
export type VariableValue = z.infer<typeof variableValueSchema>;

export const campaignChannelRefSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  displayPhoneNumber: z.string().nullable(),
});
export type CampaignChannelRef = z.infer<typeof campaignChannelRefSchema>;

export const campaignDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(campaignStatuses),
  template: z.object({ id: z.string(), name: z.string() }),
  channel: campaignChannelRefSchema.nullable(),
  tagIds: z.array(z.string()),
  variableValues: z.array(variableValueSchema),
  scheduledAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  totalRecipients: z.number(),
  sentCount: z.number(),
  deliveredCount: z.number(),
  readCount: z.number(),
  failedCount: z.number(),
  createdAt: z.string(),
});
export type CampaignDto = z.infer<typeof campaignDtoSchema>;

// Etiqueta de audiencia (con conteo de contactos con opt-in).
export const audienceTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  contactCount: z.number(),
});
export type AudienceTag = z.infer<typeof audienceTagSchema>;

// Datos para el asistente de creación (plantillas, etiquetas, canales).
export const campaignMetaSchema = z.object({
  templates: z.array(templateDtoSchema),
  tags: z.array(audienceTagSchema),
  channels: z.array(campaignChannelRefSchema),
});
export type CampaignMeta = z.infer<typeof campaignMetaSchema>;

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  templateId: z.string().min(1),
  channelId: z.string().nullable().default(null),
  tagIds: z.array(z.string()).default([]),
  variableValues: z.array(variableValueSchema).default([]),
  scheduledAt: z.string().datetime().nullable().default(null),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  templateId: z.string().min(1).optional(),
  channelId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  variableValues: z.array(variableValueSchema).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// Vista previa de audiencia (cuántos contactos recibirán).
export const audiencePreviewSchema = z.object({ count: z.number() });
export type AudiencePreview = z.infer<typeof audiencePreviewSchema>;
