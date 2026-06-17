import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  DownloadedMedia,
  SendResult,
  WhatsAppProvider,
} from "../whatsapp-provider.interface";
import {
  WhatsappConnectionService,
  type WhatsappCreds,
} from "../whatsapp-connection.service";

/**
 * Adaptador de la WhatsApp Business Cloud API (Meta).
 * Resuelve las credenciales en cada envío desde la conexión activa
 * (Embedded Signup en BD) o, en su defecto, del .env. Si no hay credenciales,
 * funciona en modo simulado (registra en log y devuelve un id sintético),
 * así el CRM nunca se rompe por no estar conectado todavía.
 */
@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";
  private readonly logger = new Logger("WhatsApp");

  constructor(private readonly connection: WhatsappConnectionService) {}

  async sendText(
    to: string,
    text: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult> {
    const creds = await this.connection.resolveCreds(fromPhoneNumberId);
    if (!creds) return this.simulate("text", to, text);
    return this.post(creds, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    });
  }

  async sendMedia(
    to: string,
    kind: "IMAGE" | "DOCUMENT",
    mediaUrl: string,
    caption?: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult> {
    const creds = await this.connection.resolveCreds(fromPhoneNumberId);
    if (!creds) return this.simulate(kind, to, mediaUrl);
    const key = kind === "IMAGE" ? "image" : "document";
    return this.post(creds, {
      messaging_product: "whatsapp",
      to,
      type: key,
      [key]: { link: mediaUrl, ...(caption ? { caption } : {}) },
    });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    language: string,
    variables: string[],
    fromPhoneNumberId?: string,
  ): Promise<SendResult> {
    const creds = await this.connection.resolveCreds(fromPhoneNumberId);
    if (!creds) return this.simulate("template", to, templateName);
    const components = variables.length
      ? [
          {
            type: "body",
            parameters: variables.map((v) => ({ type: "text", text: v })),
          },
        ]
      : [];
    return this.post(creds, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length ? { components } : {}),
      },
    });
  }

  async sendReaction(
    to: string,
    targetWaMessageId: string,
    emoji: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult> {
    const creds = await this.connection.resolveCreds(fromPhoneNumberId);
    if (!creds) return this.simulate("reaction", to, emoji);
    return this.post(creds, {
      messaging_product: "whatsapp",
      to,
      type: "reaction",
      reaction: { message_id: targetWaMessageId, emoji },
    });
  }

  async downloadMedia(
    mediaId: string,
    fromPhoneNumberId?: string,
  ): Promise<DownloadedMedia> {
    const creds = await this.connection.resolveCreds(fromPhoneNumberId);
    if (!creds) {
      return {
        url: `https://example.invalid/media/${mediaId}`,
        mimeType: "application/octet-stream",
      };
    }
    const res = await fetch(
      `https://graph.facebook.com/${creds.version}/${mediaId}`,
      { headers: { Authorization: `Bearer ${creds.token}` } },
    );
    if (!res.ok) throw new Error(`Meta media lookup ${res.status}`);
    const meta = (await res.json()) as { url: string; mime_type: string };
    // TODO: descargar el binario y subirlo a S3/almacenamiento.
    return { url: meta.url, mimeType: meta.mime_type };
  }

  private async post(
    creds: WhatsappCreds,
    body: unknown,
  ): Promise<SendResult> {
    const res = await fetch(
      `https://graph.facebook.com/${creds.version}/${creds.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Meta send ${res.status}: ${err}`);
      throw new Error(`Meta send failed ${res.status}`);
    }
    const data = (await res.json()) as { messages?: { id: string }[] };
    return { waMessageId: data.messages?.[0]?.id ?? "" };
  }

  private simulate(kind: string, to: string, body: string): SendResult {
    const waMessageId = `wamid.sim.${randomUUID()}`;
    this.logger.warn(
      `[sin conexión WhatsApp] → [${kind}] a ${to}: "${body}" (${waMessageId})`,
    );
    return { waMessageId };
  }
}
