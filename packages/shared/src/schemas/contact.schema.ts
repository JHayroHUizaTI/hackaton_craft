import { z } from "zod";

// Contacto enriquecido para la sección de Contactos (directorio).
export const contactListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string(),
  optIn: z.boolean(),
  lastMessageAt: z.string().nullable(),
  createdAt: z.string(),
  tags: z.array(z.object({ name: z.string(), color: z.string().nullable() })),
  source: z
    .object({ id: z.string(), name: z.string(), color: z.string().nullable() })
    .nullable(),
});
export type ContactListItem = z.infer<typeof contactListItemSchema>;

// Editar datos básicos de un contacto.
export const updateContactSchema = z.object({
  name: z.string().max(160).nullable().optional(),
  optIn: z.boolean().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
