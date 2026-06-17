import { Injectable, Logger } from "@nestjs/common";
import {
  EMBEDDING_DIM,
  type EmbeddingProvider,
} from "./embedding.provider";

/**
 * Embedder real con Voyage AI (recomendado por Anthropic; Claude no expone
 * endpoint de embeddings). Se activa cuando VOYAGE_API_KEY está configurada.
 * voyage-3.5 produce vectores de 1024 dimensiones.
 */
@Injectable()
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = "voyage";
  readonly dim = EMBEDDING_DIM;
  private readonly logger = new Logger("VoyageEmbedding");
  private readonly apiKey = process.env.VOYAGE_API_KEY ?? "";
  private readonly model = process.env.VOYAGE_MODEL ?? "voyage-3.5";

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Voyage ${res.status}: ${err}`);
      throw new Error(`Voyage embeddings failed ${res.status}`);
    }
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data.map((d) => d.embedding);
  }
}
