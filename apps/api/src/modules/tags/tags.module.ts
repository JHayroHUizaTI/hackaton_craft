import { Module } from "@nestjs/common";
import { TagService } from "./tag.service";
import { TagsController } from "./tags.controller";

@Module({
  controllers: [TagsController],
  providers: [TagService],
  exports: [TagService],
})
export class TagsModule {}
