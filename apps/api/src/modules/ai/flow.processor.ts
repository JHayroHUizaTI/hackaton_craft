import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { QUEUE_FLOW } from "../../infra/queue/queue.constants";
import { FlowEngineService } from "./flow-engine.service";

interface FlowResumeJob {
  conversationId: string;
}

@Processor(QUEUE_FLOW)
export class FlowProcessor extends WorkerHost {
  constructor(private readonly engine: FlowEngineService) {
    super();
  }

  async process(job: Job<FlowResumeJob>): Promise<void> {
    await this.engine.resumeTimer(job.data.conversationId);
  }
}
