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
  createFlowSchema,
  updateFlowSchema,
  Role,
  type CreateFlowInput,
  type UpdateFlowInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { FlowService } from "./flow.service";

@Controller("flows")
@UseGuards(JwtAuthGuard)
export class FlowsController {
  constructor(private readonly flows: FlowService) {}

  @Get()
  list() {
    return this.flows.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.flows.getById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body(new ZodValidationPipe(createFlowSchema)) body: CreateFlowInput) {
    return this.flows.create(body);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFlowSchema)) body: UpdateFlowInput,
  ) {
    return this.flows.update(id, body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.flows.remove(id);
  }
}
