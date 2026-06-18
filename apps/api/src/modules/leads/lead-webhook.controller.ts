import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { leadWebhookSchema, type LeadWebhookInput } from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { LeadService } from "./lead.service";

/**
 * Webhook público para recibir leads de sistemas externos (landing pages,
 * anuncios, n8n, Zapier…). Se autentica con un token en la cabecera
 * `x-webhook-token` que debe coincidir con LEAD_WEBHOOK_TOKEN del .env.
 */
@Controller("webhooks/lead")
export class LeadWebhookController {
  constructor(private readonly leads: LeadService) {}

  @Post()
  @HttpCode(200)
  ingest(
    @Headers("x-webhook-token") token: string | undefined,
    @Body(new ZodValidationPipe(leadWebhookSchema)) body: LeadWebhookInput,
  ) {
    this.assertToken(token);
    return this.leads.ingestLead(body);
  }

  private assertToken(token: string | undefined): void {
    const expected = process.env.LEAD_WEBHOOK_TOKEN;
    if (!expected) {
      throw new UnauthorizedException(
        "Webhook deshabilitado: falta LEAD_WEBHOOK_TOKEN en el servidor",
      );
    }
    const a = Buffer.from(token ?? "");
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Token de webhook inválido");
    }
  }
}
