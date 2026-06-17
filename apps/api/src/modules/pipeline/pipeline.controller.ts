import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createDealSchema,
  moveDealSchema,
  updateDealSchema,
  type CreateDealInput,
  type MoveDealInput,
  type UpdateDealInput,
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
}
