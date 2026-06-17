import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AiMode,
  ConversationStatus,
  MessageAuthor,
  MessageType,
} from "@crm/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { MessagingService } from "../messaging/messaging.service";
import { AgentService } from "./agent.service";

/**
 * Responde automáticamente a mensajes entrantes cuando la conversación está
 * en modo AUTOPILOT. Aplica los guardrails antes de enviar:
 *  - solo autopilot, contacto con opt-in, IA no pausada por un humano,
 *  - dentro de la ventana de 24h,
 *  - la IA no recomienda escalar.
 * Si algún guardrail falla, marca la conversación como PENDING para un humano.
 */
@Injectable()
export class AutopilotService {
  private readonly logger = new Logger("Autopilot");

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AgentService,
    private readonly messaging: MessagingService,
  ) {}

  @OnEvent("conversation.inbound")
  async onInbound(payload: { conversationId: string }): Promise<void> {
    const { conversationId } = payload;
    try {
      const convo = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { contact: true },
      });
      if (!convo || convo.aiMode !== AiMode.AUTOPILOT) return;
      if (!convo.contact.optIn) return;
      if (convo.aiPausedUntil && convo.aiPausedUntil > new Date()) {
        this.logger.debug(`IA pausada (humano activo) en ${conversationId}`);
        return;
      }

      const res = await this.agent.suggest(conversationId);

      if (res.escalate || !res.suggestion || !res.windowOpen) {
        if (convo.status !== ConversationStatus.PENDING) {
          await this.messaging.setStatus(
            conversationId,
            ConversationStatus.PENDING,
          );
        }
        this.logger.log(
          `Autopilot escaló ${conversationId}: ${res.escalationReason ?? "sin respuesta"}`,
        );
        return;
      }

      await this.messaging.queueOutbound(
        { conversationId, type: MessageType.TEXT, text: res.suggestion },
        MessageAuthor.AI,
      );
      this.logger.log(`Autopilot respondió ${conversationId}`);
    } catch (e) {
      this.logger.error(
        `Autopilot falló en ${conversationId}: ${(e as Error).message}`,
      );
    }
  }
}
