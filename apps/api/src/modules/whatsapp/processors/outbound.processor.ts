import { Logger } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUE_OUTBOUND } from "../../../infra/queue/queue.constants";
import { MessagingService } from "../../messaging/messaging.service";

interface OutboundJob {
  messageId: string;
}

@Processor(QUEUE_OUTBOUND)
export class OutboundProcessor extends WorkerHost {
  private readonly logger = new Logger("OutboundProcessor");

  constructor(private readonly messaging: MessagingService) {
    super();
  }

  async process(job: Job<OutboundJob>): Promise<void> {
    await this.messaging.processOutbound(job.data.messageId);
  }

  // Tras agotar los reintentos, marcar el mensaje como FAILED.
  @OnWorkerEvent("failed")
  async onFailed(job: Job<OutboundJob>, err: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= attempts) {
      this.logger.error(
        `Envío ${job.data.messageId} falló definitivamente: ${err.message}`,
      );
      await this.messaging.markFailed(job.data.messageId, err.message);
    }
  }
}
