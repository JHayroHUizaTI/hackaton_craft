import type { Classification } from "@crm/shared";
import type { LlmRequest, LlmResponse } from "./llm.types";

export const LLM_PROVIDER = Symbol("LLM_PROVIDER");

export interface LLMProvider {
  readonly name: string; // "anthropic" | "fake"
  generate(req: LlmRequest): Promise<LlmResponse>;
  classify(text: string): Promise<Classification>;
}
