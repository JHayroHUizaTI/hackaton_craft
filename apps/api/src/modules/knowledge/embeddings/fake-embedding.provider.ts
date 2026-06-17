import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  EMBEDDING_DIM,
  type EmbeddingProvider,
} from "./embedding.provider";

/**
 * Embedder simulado y determinista (sin API key). Construye un vector
 * "bag-of-words" hasheando cada token en una de EMBEDDING_DIM posiciones y
 * normalizando. Textos que comparten palabras quedan cerca por coseno —
 * suficiente para demostrar la búsqueda semántica del RAG sin Voyage.
 */
@Injectable()
export class FakeEmbeddingProvider implements EmbeddingProvider {
  readonly name = "fake";
  readonly dim = EMBEDDING_DIM;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vectorize(t));
  }

  private vectorize(text: string): number[] {
    const vec = new Array<number>(this.dim).fill(0);
    const tokens = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quitar acentos
      .match(/[a-z0-9]{2,}/g);
    if (!tokens) return vec;

    for (const token of tokens) {
      const h = createHash("md5").update(token).digest();
      const idx = h.readUInt32BE(0) % this.dim;
      vec[idx]! += 1;
    }
    // Normalización L2 (para que el coseno sea estable).
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map((x) => x / norm);
  }
}
