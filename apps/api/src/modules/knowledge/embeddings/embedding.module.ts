import { Global, Logger, Module } from "@nestjs/common";
import { EMBEDDING_PROVIDER } from "./embedding.provider";
import { FakeEmbeddingProvider } from "./fake-embedding.provider";
import { VoyageEmbeddingProvider } from "./voyage-embedding.provider";

@Global()
@Module({
  providers: [
    FakeEmbeddingProvider,
    VoyageEmbeddingProvider,
    {
      provide: EMBEDDING_PROVIDER,
      inject: [FakeEmbeddingProvider, VoyageEmbeddingProvider],
      useFactory: (
        fake: FakeEmbeddingProvider,
        voyage: VoyageEmbeddingProvider,
      ) => {
        const useReal = !!process.env.VOYAGE_API_KEY;
        const provider = useReal ? voyage : fake;
        new Logger("Embeddings").log(
          `Embedder activo: ${provider.name}${useReal ? "" : " (simulado — sin VOYAGE_API_KEY)"}`,
        );
        return provider;
      },
    },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
