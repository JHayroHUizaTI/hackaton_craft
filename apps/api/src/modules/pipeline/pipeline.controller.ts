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
  createDealSchema,
  createStageSchema,
  moveDealSchema,
  reorderStagesSchema,
  updateDealSchema,
  updateStageSchema,
  type CreateDealInput,
  type CreateStageInput,
  type MoveDealInput,
  type ReorderStagesInput,
  type UpdateDealInput,
  type UpdateStageInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PipelineService } from "./pipeline.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Get("pipeline")
  getPipeline() {
    return this.pipeline.getPipeline();
  }

  @Post("deals")
  createDeal(
    @Body(new ZodValidationPipe(createDealSchema)) body: CreateDealInput,
  ) {
    return this.pipeline.createDeal(body);
  }

  @Patch("deals/:id/stage")
  moveDeal(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(moveDealSchema)) body: MoveDealInput,
  ) {
    return this.pipeline.moveDeal(id, body);
  }

  @Patch("deals/:id")
  updateDeal(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateDealSchema)) body: UpdateDealInput,
  ) {
    return this.pipeline.updateDeal(id, body);
  }

  @Delete("deals/:id")
  deleteDeal(@Param("id") id: string) {
    return this.pipeline.deleteDeal(id);
  }

  // ── Etapas ─────────────────────────────────────────────────
  @Post("stages")
  createStage(
    @Body(new ZodValidationPipe(createStageSchema)) body: CreateStageInput,
  ) {
    return this.pipeline.createStage(body);
  }

  @Patch("stages/reorder")
  reorderStages(
    @Body(new ZodValidationPipe(reorderStagesSchema)) body: ReorderStagesInput,
  ) {
    return this.pipeline.reorderStages(body);
  }

  @Patch("stages/:id")
  updateStage(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStageSchema)) body: UpdateStageInput,
  ) {
    return this.pipeline.updateStage(id, body);
  }

  @Delete("stages/:id")
  deleteStage(@Param("id") id: string) {
    return this.pipeline.deleteStage(id);
  }
}
