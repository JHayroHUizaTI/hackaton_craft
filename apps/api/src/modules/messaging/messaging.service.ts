import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Queue } from "bullmq";
import {
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
  type AiMode,
  type ConversationDto,
  type ConversationFilter,
  type ConversationStatus,
  type MessageDto,
  type NoteDto,
  type SendMessageInput,
} from "@crm/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { QUEUE_OUTBOUND } from "../../infra/queue/queue.constants";
import {
  WHATSAPP_PROVIDER,
  type WhatsAppProvider,
} from "../whatsapp/whatsapp-provider.interface";
import { WhatsappConnectionService } from "../whatsapp/whatsapp-connection.service";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const OPT_OUT_KEYWORDS = ["BAJA", "STOP", "CANCELAR"];

export interface InboundMessage {
  from: string; // teléfono E.164
  name?: string;
  waMessageId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  channelPhoneNumberId?: string; // número que recibió el mensaje (multi-número)
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger("Messaging");

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_OUTBOUND) private readonly outbound: Queue,
    @Inject(WHATSAPP_PROVIDER) private readonly wa: WhatsAppProvider,
    private readonly connection: WhatsappConnectionService,
    private readonly events: EventEmitter2,
  ) {}

  private notify(conversationId: string): void {
    this.events.emit("inbox.changed", { conversationId });
  }

  // Pausa la IA tras intervención humana (ventana configurable).
  private readonly humanPauseMs = 15 * 60 * 1000;

  // ── Entrante: persistir (idempotente) + ventana 24h + opt-out ──
  async handleInbound(msg: InboundMessage): Promise<void> {
    // Idempotencia: si ya procesamos este wa_message_id, ignorar.
    const existing = await this.prisma.message.findUnique({
      where: { waMessageId: msg.waMessageId },
      select: { id: true },
    });
    if (existing) {
      this.logger.debug(`Duplicado ignorado: ${msg.waMessageId}`);
      return;
    }

    const now = new Date();
    const optOut =
      !!msg.text && OPT_OUT_KEYWORDS.includes(msg.text.trim().toUpperCase());

    const contact = await this.prisma.contact.upsert({
      where: { phone: msg.from },
      create: {
        phone: msg.from,
        name: msg.name,
        lastMessageAt: now,
        optIn: !optOut,
      },
      update: {
        lastMessageAt: now,
        ...(msg.name ? { name: msg.name } : {}),
        ...(optOut ? { optIn: false } : {}),
      },
    });

    // Canal (número) por el que entró el mensaje, para responder por el mismo.
    const channelId = msg.channelPhoneNumberId
      ? await this.connection.resolveChannelId(msg.channelPhoneNumberId)
      : null;

    // Reusar conversación abierta o crear una nueva. La ventana de 24h se
    // renueva con cada mensaje entrante del contacto.
    const open = await this.prisma.conversation.findFirst({
      where: { contactId: contact.id, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
    });
    const windowExpiresAt = new Date(now.getTime() + WINDOW_MS);
    const conversation = open
      ? await this.prisma.conversation.update({
          where: { id: open.id },
          data: {
            windowExpiresAt,
            lastMessageAt: now,
            status: "OPEN",
            // Fija el canal si aún no lo tenía (conversaciones previas).
            ...(channelId && !open.channelId ? { channelId } : {}),
          },
        })
      : await this.prisma.conversation.create({
          data: {
            contactId: contact.id,
            channelId,
            status: "OPEN",
            windowExpiresAt,
            lastMessageAt: now,
          },
        });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        waMessageId: msg.waMessageId,
        direction: MessageDirection.INBOUND,
        type: msg.type,
        author: MessageAuthor.CONTACT,
        content: msg.text,
        mediaUrl: msg.mediaUrl,
        status: MessageStatus.DELIVERED,
      },
    });

    this.logger.log(
      `← ${msg.from}: "${msg.text ?? msg.type}"${optOut ? " [OPT-OUT]" : ""}`,
    );
    this.notify(conversation.id);
    // Disparar el agente IA si la conversación está en autopilot (lo maneja
    // AutopilotService de forma asíncrona, con sus propios guardrails).
    this.events.emit("conversation.inbound", { conversationId: conversation.id });
  }

  // ── Actualización de estado (sent/delivered/read/failed) ───────
  async handleStatus(waMessageId: string, status: MessageStatus): Promise<void> {
    const msg = await this.prisma.message.findUnique({
      where: { waMessageId },
      select: { conversationId: true },
    });
    if (!msg) return;
    await this.prisma.message.update({
      where: { waMessageId },
      data: { status },
    });
    this.notify(msg.conversationId);
  }

  // ── Saliente: validar ventana, persistir QUEUED y encolar ──────
  async queueOutbound(
    input: SendMessageInput,
    author: MessageAuthor,
  ): Promise<MessageDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
    });
    if (!conversation) throw new NotFoundException("Conversación no encontrada");

    const windowOpen =
      !!conversation.windowExpiresAt &&
      conversation.windowExpiresAt > new Date();

    // Regla 3: fuera de ventana solo se permiten plantillas aprobadas.
    if (!windowOpen && input.type === MessageType.TEXT) {
      throw new BadRequestException(
        "Fuera de la ventana de 24h: solo se pueden enviar plantillas aprobadas.",
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: input.type,
        author,
        content: input.type === MessageType.TEXT ? input.text : input.caption,
        mediaUrl: input.mediaUrl,
        status: MessageStatus.QUEUED,
      },
    });

    await this.outbound.add("send", { messageId: message.id });

    // Si responde un humano, pausar la IA un rato (no pisar al agente humano).
    if (author === MessageAuthor.HUMAN) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { aiPausedUntil: new Date(Date.now() + this.humanPauseMs) },
      });
    }

    this.notify(conversation.id);
    return this.toMessageDto(message);
  }

  async setAiMode(id: string, mode: AiMode): Promise<ConversationDto> {
    const c = await this.prisma.conversation
      .update({
        where: { id },
        data: { aiMode: mode },
        include: { contact: true, assignedAgent: true, channel: true },
      })
      .catch(() => {
        throw new NotFoundException("Conversación no encontrada");
      });
    this.notify(c.id);
    return this.toConversationDto(c);
  }

  // ── Procesamiento del envío (lo invoca el OutboundProcessor) ───
  async processOutbound(messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { include: { contact: true, channel: true } },
      },
    });
    if (!message) return;
    if (message.status === MessageStatus.SENT) return; // ya enviado (reintento)

    const to = message.conversation.contact.phone;
    // Responder por el mismo número (canal) por el que entró la conversación.
    const from = message.conversation.channel?.phoneNumberId;
    const result =
      message.type === MessageType.TEXT
        ? await this.wa.sendText(to, message.content ?? "", from)
        : await this.wa.sendMedia(
            to,
            message.type === MessageType.IMAGE ? "IMAGE" : "DOCUMENT",
            message.mediaUrl ?? "",
            message.content ?? undefined,
            from,
          );

    await this.prisma.message.update({
      where: { id: message.id },
      data: { waMessageId: result.waMessageId, status: MessageStatus.SENT },
    });
    this.notify(message.conversationId);
  }

  async markFailed(messageId: string, reason: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.FAILED, errorReason: reason.slice(0, 500) },
    });
  }

  // ── Consultas para la bandeja ──────────────────────────────────
  async listConversations(
    userId: string,
    opts: { filter: ConversationFilter; status?: ConversationStatus },
  ): Promise<ConversationDto[]> {
    const where: Prisma.ConversationWhereInput = {};

    // Estado: si se indica, filtra; si no, oculta las cerradas.
    if (opts.status) where.status = opts.status;
    else where.status = { not: "CLOSED" };

    // Asignación.
    if (opts.filter === "unassigned") where.assignedAgentId = null;
    else if (opts.filter === "mine") where.assignedAgentId = userId;

    const rows = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      include: { contact: true, assignedAgent: true, channel: true },
      take: 100,
    });
    return rows.map((c) => this.toConversationDto(c));
  }

  async assignConversation(
    id: string,
    agentId: string | null,
  ): Promise<ConversationDto> {
    if (agentId) {
      const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
      if (!agent) throw new NotFoundException("Agente no encontrado");
    }
    const c = await this.prisma.conversation
      .update({
        where: { id },
        data: { assignedAgentId: agentId },
        include: { contact: true, assignedAgent: true, channel: true },
      })
      .catch(() => {
        throw new NotFoundException("Conversación no encontrada");
      });
    this.notify(c.id);
    return this.toConversationDto(c);
  }

  async setStatus(
    id: string,
    status: ConversationStatus,
  ): Promise<ConversationDto> {
    const c = await this.prisma.conversation
      .update({
        where: { id },
        data: { status },
        include: { contact: true, assignedAgent: true, channel: true },
      })
      .catch(() => {
        throw new NotFoundException("Conversación no encontrada");
      });
    this.notify(c.id);
    return this.toConversationDto(c);
  }

  // ── Notas internas ─────────────────────────────────────────────
  async listNotes(conversationId: string): Promise<NoteDto[]> {
    const rows = await this.prisma.note.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });
    return rows.map((n) => ({
      id: n.id,
      body: n.body,
      author: { id: n.author.id, name: n.author.name },
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async addNote(
    conversationId: string,
    authorId: string,
    body: string,
  ): Promise<NoteDto> {
    const n = await this.prisma.note.create({
      data: { conversationId, authorId, body },
      include: { author: true },
    });
    return {
      id: n.id,
      body: n.body,
      author: { id: n.author.id, name: n.author.name },
      createdAt: n.createdAt.toISOString(),
    };
  }

  private toConversationDto(c: {
    id: string;
    status: string;
    aiMode: string;
    aiPausedUntil: Date | null;
    windowExpiresAt: Date | null;
    lastMessageAt: Date | null;
    contact: { id: string; phone: string; name: string | null };
    assignedAgent: { id: string; name: string | null } | null;
    channel?: {
      id: string;
      label: string | null;
      displayPhoneNumber: string | null;
    } | null;
  }): ConversationDto {
    const now = new Date();
    return {
      id: c.id,
      status: c.status as ConversationStatus,
      contact: { id: c.contact.id, phone: c.contact.phone, name: c.contact.name },
      assignedAgent: c.assignedAgent
        ? { id: c.assignedAgent.id, name: c.assignedAgent.name }
        : null,
      channel: c.channel
        ? {
            id: c.channel.id,
            label: c.channel.label,
            displayPhoneNumber: c.channel.displayPhoneNumber,
          }
        : null,
      aiMode: c.aiMode as AiMode,
      aiPaused: !!c.aiPausedUntil && c.aiPausedUntil > now,
      windowExpiresAt: c.windowExpiresAt?.toISOString() ?? null,
      windowOpen: !!c.windowExpiresAt && c.windowExpiresAt > now,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    };
  }

  async getMessages(conversationId: string): Promise<MessageDto[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return rows.map((m) => this.toMessageDto(m));
  }

  private toMessageDto(m: {
    id: string;
    direction: string;
    type: string;
    author: string;
    content: string | null;
    mediaUrl: string | null;
    status: string;
    createdAt: Date;
  }): MessageDto {
    return {
      id: m.id,
      direction: m.direction as MessageDirection,
      type: m.type as MessageType,
      author: m.author as MessageAuthor,
      content: m.content,
      mediaUrl: m.mediaUrl,
      status: m.status as MessageStatus,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
