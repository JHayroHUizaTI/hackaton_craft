import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type {
  ConnectWhatsappInput,
  WhatsappChannel,
  WhatsappConnectionStatus,
} from "@crm/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";

export interface WhatsappCreds {
  token: string;
  phoneNumberId: string;
  version: string;
}

@Injectable()
export class WhatsappConnectionService {
  private readonly logger = new Logger("WhatsAppConnection");
  private readonly version = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";

  constructor(private readonly prisma: PrismaService) {}

  // ── Resolución de credenciales para enviar ───────────────────
  /**
   * Credenciales para enviar.
   * - Si se indica `phoneNumberId`, usa ese canal concreto (responder por el
   *   mismo número por el que entró la conversación).
   * - Si no, cae al primer canal activo o, en su defecto, al .env.
   */
  async resolveCreds(phoneNumberId?: string): Promise<WhatsappCreds | null> {
    if (phoneNumberId) {
      const conn = await this.prisma.whatsappConnection.findFirst({
        where: { phoneNumberId, isActive: true },
      });
      if (conn?.accessToken) {
        return {
          token: conn.accessToken,
          phoneNumberId: conn.phoneNumberId,
          version: this.version,
        };
      }
      // El número pedido es el del .env.
      if (
        phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_TOKEN
      ) {
        return {
          token: process.env.WHATSAPP_TOKEN,
          phoneNumberId,
          version: this.version,
        };
      }
      return null;
    }

    // Sin número específico: primer canal activo o .env.
    const conn = await this.prisma.whatsappConnection.findFirst({
      where: { isActive: true },
      orderBy: { connectedAt: "desc" },
    });
    if (conn?.accessToken && conn.phoneNumberId) {
      return {
        token: conn.accessToken,
        phoneNumberId: conn.phoneNumberId,
        version: this.version,
      };
    }
    const envToken = process.env.WHATSAPP_TOKEN;
    const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (envToken && envPhone) {
      return { token: envToken, phoneNumberId: envPhone, version: this.version };
    }
    return null;
  }

  /**
   * Resuelve el id de la conexión (canal) a partir del phone_number_id que
   * Meta envía en el webhook. Devuelve null si es el del .env o no se conoce.
   */
  async resolveChannelId(phoneNumberId: string): Promise<string | null> {
    const conn = await this.prisma.whatsappConnection.findUnique({
      where: { phoneNumberId },
      select: { id: true },
    });
    return conn?.id ?? null;
  }

  // ── Listado de canales (multi-número) ────────────────────────
  async listChannels(): Promise<WhatsappChannel[]> {
    const rows = await this.prisma.whatsappConnection.findMany({
      orderBy: { connectedAt: "desc" },
    });
    const channels: WhatsappChannel[] = rows.map((c) => ({
      id: c.id,
      phoneNumberId: c.phoneNumberId,
      displayPhoneNumber: c.displayPhoneNumber,
      label: c.label,
      wabaId: c.wabaId,
      mode: c.mode,
      status: c.status,
      source: "embedded",
      isActive: c.isActive,
      connectedAt: c.connectedAt.toISOString(),
    }));

    // El número del .env aparece como canal extra si no está ya en la BD.
    const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const envToken = process.env.WHATSAPP_TOKEN;
    if (
      envPhone &&
      envToken &&
      !rows.some((r) => r.phoneNumberId === envPhone)
    ) {
      channels.push({
        id: "env",
        phoneNumberId: envPhone,
        displayPhoneNumber: null,
        label: ".env",
        wabaId: null,
        mode: "api",
        status: "connected",
        source: "env",
        isActive: true,
        connectedAt: null,
      });
    }
    return channels;
  }

  // ── Estado agregado (compatibilidad) ─────────────────────────
  async status(): Promise<WhatsappConnectionStatus> {
    const conn = await this.prisma.whatsappConnection.findFirst({
      where: { isActive: true },
      orderBy: { connectedAt: "desc" },
    });
    if (conn) {
      return {
        connected: true,
        phoneNumberId: conn.phoneNumberId,
        displayPhoneNumber: conn.displayPhoneNumber,
        wabaId: conn.wabaId,
        mode: conn.mode,
        source: "embedded",
      };
    }
    const envToken = process.env.WHATSAPP_TOKEN;
    const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (envToken && envPhone) {
      return {
        connected: true,
        phoneNumberId: envPhone,
        displayPhoneNumber: null,
        wabaId: null,
        mode: "api",
        source: "env",
      };
    }
    return {
      connected: false,
      phoneNumberId: null,
      displayPhoneNumber: null,
      wabaId: null,
      mode: null,
      source: null,
    };
  }

  // ── Conectar un número (desde el Embedded Signup) ────────────
  async connect(input: ConnectWhatsappInput): Promise<WhatsappChannel[]> {
    const token = input.code
      ? await this.exchangeCode(input.code)
      : input.accessToken!;

    // Upsert por phoneNumberId: reconectar el mismo número actualiza su token
    // sin tocar a los demás canales (ya no se desactiva nada).
    await this.prisma.whatsappConnection.upsert({
      where: { phoneNumberId: input.phoneNumberId },
      create: {
        wabaId: input.wabaId ?? null,
        phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: input.displayPhoneNumber ?? null,
        label: input.label ?? null,
        accessToken: token,
        mode: input.mode,
        isActive: true,
        status: "connected",
      },
      update: {
        wabaId: input.wabaId ?? undefined,
        displayPhoneNumber: input.displayPhoneNumber ?? undefined,
        label: input.label ?? undefined,
        accessToken: token,
        mode: input.mode,
        isActive: true,
        status: "connected",
      },
    });
    this.logger.log(`WhatsApp conectado (${input.mode}) ${input.phoneNumberId}`);
    return this.listChannels();
  }

  // ── Desconectar un número concreto ───────────────────────────
  async disconnect(phoneNumberId: string): Promise<WhatsappChannel[]> {
    await this.prisma.whatsappConnection.updateMany({
      where: { phoneNumberId },
      data: { isActive: false, status: "disconnected" },
    });
    this.logger.log(`WhatsApp desconectado ${phoneNumberId}`);
    return this.listChannels();
  }

  // Canjea el code del Embedded Signup por un token de acceso.
  private async exchangeCode(code: string): Promise<string> {
    const appId = process.env.WHATSAPP_APP_ID;
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appId || !appSecret) {
      throw new BadRequestException(
        "Faltan WHATSAPP_APP_ID o WHATSAPP_APP_SECRET en el servidor",
      );
    }
    const url =
      `https://graph.facebook.com/${this.version}/oauth/access_token` +
      `?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Canje de code falló ${res.status}: ${err}`);
      throw new BadRequestException("No se pudo canjear el código de Meta");
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new BadRequestException("Meta no devolvió un access_token");
    }
    return data.access_token;
  }
}
