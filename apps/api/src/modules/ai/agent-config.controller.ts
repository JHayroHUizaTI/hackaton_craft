import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import {
  Role,
  updateAgentConfigSchema,
  type UpdateAgentConfigInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AgentConfigService } from "./agent-config.service";

@Controller("agent-config")
@UseGuards(JwtAuthGuard)
export class AgentConfigController {
  constructor(private readonly config: AgentConfigService) {}

  @Get()
  get() {
    return this.config.getConfig();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Body(new ZodValidationPipe(updateAgentConfigSchema))
    body: UpdateAgentConfigInput,
  ) {
    return this.config.updateConfig(body);
  }
}
