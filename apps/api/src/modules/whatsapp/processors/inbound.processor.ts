import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUE_INBOUND } from "../../../infra/queue/queue.constants";
import { MessagingService } from "../../messaging/messaging.service";
import {
  WHATSAPP_PROVIDER,
  type WhatsAppProvider,
} from "../whatsapp-provider.interface";
import type { InboundJob } from "../webhook.types";

@Processor(QUEUE_INBOUND)
export class InboundProcessor extends WorkerHost {
  private readonly logger = new Logger("InboundProcessor");

  constructor(
    private readonly messaging: MessagingService,
    @Inject(WHATSAPP_PROVIDER) private readonly wa: WhatsAppProvider,
  ) {
    super();
  }

  async process(job: Job<InboundJob>): Promise<void> {
    const data = job.data;

    if (data.kind === "status") {
      await this.messaging.handleStatus(data.waMessageId, data.status);
      return;
    }

    // Mensaje entrante: si trae medio, descargarlo antes de persistir.
    let mediaUrl: string | undefined;
    if (data.mediaId) {
      const media = await this.wa.downloadMedia(
        data.mediaId,
        data.channelPhoneNumberId,
      );
      mediaUrl = media.url;
    }

    await this.messaging.handleInbound({
      from: data.from,
      name: data.name,
      waMessageId: data.waMessageId,
      type: data.type,
      text: data.text,
      mediaUrl,
      channelPhoneNumberId: data.channelPhoneNumberId,
    });
  }
}
