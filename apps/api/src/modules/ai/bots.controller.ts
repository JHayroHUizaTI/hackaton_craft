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
  Role,
  type CreateBotInput,
  type UpdateBotInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { BotService } from "./bot.service";

@Controller("bots")
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(private readonly bots: BotService) {}

  @Get()
  list() {
    return this.bots.list();
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
