import { Global, Logger, Module } from "@nestjs/common";
import { LLM_PROVIDER } from "./llm.provider";
import { FakeLLMProvider } from "./providers/fake-llm.provider";
import { AnthropicLLMProvider } from "./providers/anthropic-llm.provider";

/**
 * Expone LLM_PROVIDER. Elige el adaptador en arranque:
 * - Anthropic real si ANTHROPIC_API_KEY está definida.
 * - Simulado en caso contrario.
 */
@Global()
@Module({
  providers: [
    FakeLLMProvider,
    AnthropicLLMProvider,
    {
      provide: LLM_PROVIDER,
      inject: [FakeLLMProvider, AnthropicLLMProvider],
      useFactory: (fake: FakeLLMProvider, anthropic: AnthropicLLMProvider) => {
        const useReal = !!process.env.ANTHROPIC_API_KEY;
        const provider = useReal ? anthropic : fake;
        new Logger("AI").log(
          `LLM activo: ${provider.name}${useReal ? "" : " (simulado — sin ANTHROPIC_API_KEY)"}`,
        );
        return provider;
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
