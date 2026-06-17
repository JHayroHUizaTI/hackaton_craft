import { z } from "zod";

// Fuente (origen del lead).
export const sourceDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  contactCount: z.number(),
  createdAt: z.string(),
});
export type SourceDto = z.infer<typeof sourceDtoSchema>;

export const createSourceSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(20).nullable().default(null),
});
export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const updateSourceSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().max(20).nullable().optional(),
});
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

// Vendedor con las fuentes que tiene asignadas.
export const sellerDtoSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  sourceIds: z.array(z.string()),
});
export type SellerDto = z.infer<typeof sellerDtoSchema>;

// Respuesta del panel de vendedores.
export const sellersResponseSchema = z.object({
  sellers: z.array(sellerDtoSchema),
  sources: z.array(sourceDtoSchema),
});
export type SellersResponse = z.infer<typeof sellersResponseSchema>;

// Asignar fuentes a un vendedor (reemplaza las actuales).
export const assignSourcesSchema = z.object({
  sourceIds: z.array(z.string()),
});
export type AssignSourcesInput = z.infer<typeof assignSourcesSchema>;

// Fijar la fuente de un contacto (null = quitar).
export const setContactSourceSchema = z.object({
  contactId: z.string(),
  sourceId: z.string().nullable(),
});
export type SetContactSourceInput = z.infer<typeof setContactSourceSchema>;
