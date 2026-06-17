import { z } from "zod";

export const productDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type ProductDto = z.infer<typeof productDtoSchema>;

export const createProductSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().max(60).nullable().default(null),
  description: z.string().max(2000).nullable().default(null),
  price: z.number().min(0).default(0),
  currency: z.string().min(3).max(3).default("USD"),
  imageUrl: z.string().url().nullable().default(null),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  sku: z.string().max(60).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().min(3).max(3).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
