import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { Classification } from "@crm/shared";
import type { LLMProvider } from "../llm.provider";
import type {
  LlmAnyBlock,
  LlmContentBlock,
  LlmMessage,
  LlmRequest,
  LlmResponse,
} from "../llm.types";

/**
 * Adaptador real de la API de Claude (Anthropic). Se activa cuando
 * ANTHROPIC_API_KEY está configurada. Modelo por defecto: claude-opus-4-8.
 *
 * Notas de diseño:
 * - Streaming + finalMessage() para evitar timeouts en respuestas largas.
 * - Prompt caching del system prompt (cache_control ephemeral).
 * - No se habilita thinking en el bucle de herramientas en esta iteración
 *   (evita tener que reenviar los bloques de thinking sin modificar entre
 *   turnos). Se controla la profundidad con output_config.effort.
 */
@Injectable()
export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";
  private readonly logger = new Logger("AnthropicLLM");
  private readonly client = new Anthropic();
  private readonly model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  async generate(req: LlmRequest): Promise<LlmResponse> {
    // Cuerpo construido de forma laxa: algunos parámetros (output_config)
    // pueden no estar en los tipos del SDK según la versión instalada.
    // RAG: si hay fragmentos recuperados, se anteponen al system prompt.
    const systemText = req.knowledge?.length
      ? `${req.system}\n\n## Base de conocimiento relevante\nUsa esta información para responder. Si no es suficiente, dilo o escala.\n${req.knowledge.map((k, i) => `[${i + 1}] ${k}`).join("\n")}`
      : req.system;

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      system: [
        {
          type: "text",
          text: systemText,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: { effort: req.effort ?? "medium" },
      messages: req.messages.map((m) => this.toSdkMessage(m)),
    };
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));
    }

    const stream = this.client.messages.stream(
      body as unknown as Anthropic.MessageStreamParams,
    );
    const msg = await stream.finalMessage();

    const content: LlmContentBlock[] = [];
    for (const block of msg.content) {
      if (block.type === "text") {
        content.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        content.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      stopReason: msg.stop_reason ?? "end_turn",
      content,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
      model: msg.model,
    };
  }

  async classify(text: string): Promise<Classification> {
    // Salida estructurada (output_config.format) para una clasificación fiable.
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 256,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              intent: { type: "string" },
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative"],
              },
              urgency: { type: "string", enum: ["low", "medium", "high"] },
              requiresHuman: { type: "boolean" },
            },
            required: ["intent", "sentiment", "urgency", "requiresHuman"],
            additionalProperties: false,
          },
        },
      },
      system:
        "Clasifica el último mensaje del cliente. Responde solo con el JSON pedido.",
      messages: [{ role: "user", content: text }],
    };
    const msg = await this.client.messages.create(
      body as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );
    const block = msg.content.find((b) => b.type === "text");
    const raw = block && block.type === "text" ? block.text : "{}";
    try {
      return JSON.parse(raw) as Classification;
    } catch {
      return {
        intent: "general",
        sentiment: "neutral",
        urgency: "low",
        requiresHuman: false,
      };
    }
  }

  private toSdkMessage(m: LlmMessage): Anthropic.MessageParam {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    const blocks = m.content.map((b: LlmAnyBlock) => {
      if (b.type === "text") return { type: "text" as const, text: b.text };
      if (b.type === "tool_use")
        return {
          type: "tool_use" as const,
          id: b.id,
          name: b.name,
          input: b.input,
        };
      return {
        type: "tool_result" as const,
        tool_use_id: b.tool_use_id,
        content: b.content,
      };
    });
    return { role: m.role, content: blocks as Anthropic.ContentBlockParam[] };
  }
}
