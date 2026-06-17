import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  DownloadedMedia,
  SendResult,
  WhatsAppProvider,
} from "../whatsapp-provider.interface";

/**
 * Proveedor simulado para desarrollo sin credenciales de Meta.
 * No envía nada real: registra en log y devuelve un wa_message_id sintético.
 */
@Injectable()
export class FakeWhatsAppProvider implements WhatsAppProvider {
  readonly name = "fake";
  private readonly logger = new Logger("FakeWhatsApp");

  async sendText(to: string, text: string): Promise<SendResult> {
    const waMessageId = `wamid.fake.${randomUUID()}`;
    this.logger.log(`→ [text] a ${to}: "${text}"  (${waMessageId})`);
    return { waMessageId };
  }

  async sendMedia(
    to: string,
    kind: "IMAGE" | "DOCUMENT",
    mediaUrl: string,
    caption?: string,
  ): Promise<SendResult> {
    const waMessageId = `wamid.fake.${randomUUID()}`;
    this.logger.log(
      `→ [${kind}] a ${to}: ${mediaUrl}${caption ? ` "${caption}"` : ""}  (${waMessageId})`,
    );
    return { waMessageId };
  }

  async downloadMedia(mediaId: string): Promise<DownloadedMedia> {
    this.logger.log(`↓ media simulada ${mediaId}`);
    return {
      url: `https://example.invalid/media/${mediaId}`,
      mimeType: "application/octet-stream",
    };
  }
}
