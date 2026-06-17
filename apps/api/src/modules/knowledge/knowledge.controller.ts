import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ingestKnowledgeSchema,
  Role,
  type IngestKnowledgeInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { KnowledgeService } from "./knowledge.service";

@Controller("knowledge")
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list() {
    return this.knowledge.listDocs();
  }

  @Get("search")
  search(@Query("q") q: string) {
    return this.knowledge.search(q ?? "");
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  ingest(
    @Body(new ZodValidationPipe(ingestKnowledgeSchema))
    body: IngestKnowledgeInput,
  ) {
    return this.knowledge.ingest(body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param("id") id: string) {
    await this.knowledge.deleteDoc(id);
    return { ok: true };
  }
}
