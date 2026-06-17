import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import {
  simulateInboundSchema,
  MessageType,
  type SimulateInboundInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { QUEUE_INBOUND } from "../../infra/queue/queue.constants";
import type { InboundMessageJob } from "./webhook.types";

/**
 * Inyecta un mensaje entrante sintético en el mismo pipeline que el webhook.
 * Permite probar la Fase 1 sin credenciales de Meta.
 */
@Controller("whatsapp/dev")
@UseGuards(JwtAuthGuard)
export class DevController {
  constructor(@InjectQueue(QUEUE_INBOUND) private readonly inbound: Queue) {}

  @Post("simulate-inbound")
  async simulate(
    @Body(new ZodValidationPipe(simulateInboundSchema))
    body: SimulateInboundInput,
  ): Promise<{ queued: true; waMessageId: string }> {
    const job: InboundMessageJob = {
      kind: "message",
      from: body.phone,
      name: body.name,
      waMessageId: `wamid.sim.${randomUUID()}`,
      type: MessageType.TEXT,
      text: body.text,
    };
    await this.inbound.add("message", job);
    return { queued: true, waMessageId: job.waMessageId };
  }
}
