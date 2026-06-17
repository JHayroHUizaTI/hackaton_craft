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
  assignSourcesSchema,
  createSourceSchema,
  setContactSourceSchema,
  updateSourceSchema,
  Role,
  type AssignSourcesInput,
  type CreateSourceInput,
  type SetContactSourceInput,
  type UpdateSourceInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { SourceService } from "./source.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private readonly sources: SourceService) {}

  // ── Fuentes ────────────────────────────────────────────────
  @Get("sources")
  list() {
    return this.sources.list();
  }

  @Post("sources")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createSourceSchema)) body: CreateSourceInput,
  ) {
    return this.sources.create(body);
  }

  @Patch("sources/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSourceSchema)) body: UpdateSourceInput,
  ) {
    return this.sources.update(id, body);
  }

  @Delete("sources/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.sources.remove(id);
  }

  // ── Vendedores ─────────────────────────────────────────────
  @Get("sellers")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  sellers() {
    return this.sources.listSellers();
  }

  @Patch("sellers/:id/sources")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  assign(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignSourcesSchema)) body: AssignSourcesInput,
  ) {
    return this.sources.assignSources(id, body.sourceIds);
  }

  // ── Fuente de un contacto ──────────────────────────────────
  @Post("contacts/source")
  setContactSource(
    @Body(new ZodValidationPipe(setContactSourceSchema))
    body: SetContactSourceInput,
  ) {
    return this.sources.setContactSource(body.contactId, body.sourceId);
  }
}
