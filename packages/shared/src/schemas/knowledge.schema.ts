import { z } from "zod";

// Documento de la base de conocimiento.
export const knowledgeDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string().nullable(),
  chunks: z.number(),
  createdAt: z.string(),
});
export type KnowledgeDocDto = z.infer<typeof knowledgeDocSchema>;

// Alta de un documento (se trocea e indexa en el backend).
export const ingestKnowledgeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(200_000),
  source: z.string().max(500).optional(),
});
export type IngestKnowledgeInput = z.infer<typeof ingestKnowledgeSchema>;

// Resultado de una búsqueda semántica (para previsualizar).
export const knowledgeHitSchema = z.object({
  content: z.string(),
  docTitle: z.string(),
  score: z.number(),
});
export type KnowledgeHit = z.infer<typeof knowledgeHitSchema>;
