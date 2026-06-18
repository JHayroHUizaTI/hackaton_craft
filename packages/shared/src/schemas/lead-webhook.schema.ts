import { z } from "zod";

// Payload de un lead recibido por webhook externo (landing, ads, n8n, Zapier…).
export const leadWebhookSchema = z.object({
  phone: z.string().min(6).max(24),
  name: z.string().max(160).optional(),
  source: z.string().max(80).optional(), // nombre de la fuente (se crea si no existe)
  tags: z.array(z.string().max(60)).optional(),
  fields: z.record(z.string()).optional(), // campos personalizados (key → valor)
  optIn: z.boolean().optional(),
});
export type LeadWebhookInput = z.infer<typeof leadWebhookSchema>;
