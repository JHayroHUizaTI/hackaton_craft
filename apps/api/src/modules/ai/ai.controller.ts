import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AgentService } from "./agent.service";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly agent: AgentService) {}

  // Copilot: la IA redacta una sugerencia de respuesta (el humano la revisa).
  @Post(":id/ai/suggest")
  suggest(@Param("id") id: string) {
    return this.agent.suggest(id);
  }
}
