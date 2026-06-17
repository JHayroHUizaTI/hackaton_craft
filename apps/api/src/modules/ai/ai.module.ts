import { Module } from "@nestjs/common";
import { LlmModule } from "./llm.module";
import { AgentService } from "./agent.service";
import { AutopilotService } from "./autopilot.service";
import { AgentConfigService } from "./agent-config.service";
import { AiController } from "./ai.controller";
import { AgentConfigController } from "./agent-config.controller";
import { MessagingModule } from "../messaging/messaging.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";

@Module({
  imports: [LlmModule, MessagingModule, KnowledgeModule],
  controllers: [AiController, AgentConfigController],
  providers: [AgentService, AutopilotService, AgentConfigService],
})
export class AiModule {}
