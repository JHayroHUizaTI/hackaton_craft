import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createBotSchema,
  updateBotSchema,
  playgroundRequestSchema,
  Role,
  type CreateBotInput,
  type UpdateBotInput,
  type PlaygroundRequest,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { BotService } from "./bot.service";
import { AgentService } from "./agent.service";

@Controller("bots")
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(
    private readonly bots: BotService,
    private readonly agent: AgentService,
  ) {}

  @Get()
  list() {
    return this.bots.list();
  }

  // Playground: probar el agente sin enviar nada (solo admin).
  @Post("playground")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  playground(
    @Body(new ZodValidationPipe(playgroundRequestSchema))
    body: PlaygroundRequest,
  ) {
    return this.agent.playground(body);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.bots.getById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createBotSchema)) body: CreateBotInput,
  ) {
    return this.bots.create(body);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBotSchema)) body: UpdateBotInput,
  ) {
    return this.bots.update(id, body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.bots.remove(id);
  }
}
