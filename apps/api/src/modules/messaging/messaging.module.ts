import { Module } from "@nestjs/common";
import { MessagingService } from "./messaging.service";
import { MessagingController } from "./messaging.controller";
import { WhatsappProviderModule } from "../whatsapp/whatsapp-provider.module";

@Module({
  imports: [WhatsappProviderModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
