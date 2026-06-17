import { Module } from "@nestjs/common";
import { SourceService } from "./source.service";
import { SourcesController } from "./sources.controller";

@Module({
  controllers: [SourcesController],
  providers: [SourceService],
  exports: [SourceService],
})
export class SourcesModule {}
