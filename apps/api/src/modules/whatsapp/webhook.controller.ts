import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_INBOUND } from "../../infra/queue/queue.constants";
import { WebhookSignatureGuard } from "./webhook-signature.guard";
import { normalizeWebhook, type MetaWebhookBody } from "./webhook.types";

@Controller("whatsapp/webhook")
export class WebhookController {
  private readonly logger = new Logger("Webhook");

  constructor(@InjectQueue(QUEUE_INBOUND) private readonly inbound: Queue) {}

  // Verificación del webhook (Meta hace GET una sola vez al configurarlo).
  @Get()
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ): string {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      this.logger.log("Webhook verificado");
      return challenge;
    }
    throw new ForbiddenException("verify_token inválido");
  }

  // Eventos entrantes. Responder 200 inmediato; el trabajo va a la cola.
  @Post()
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  async receive(@Body() body: MetaWebhookBody): Promise<{ received: true }> {
    const jobs = normalizeWebhook(body);
    if (jobs.length) {
      await this.inbound.addBulk(
        jobs.map((data) => ({ name: data.kind, data })),
      );
    }
    return { received: true };
  }
}
