import { Module } from "@nestjs/common";
import { TemplateService } from "./template.service";
import { CampaignService } from "./campaign.service";
import { CampaignProcessor } from "./campaign.processor";
import { CampaignsController } from "./campaigns.controller";
import { WhatsappProviderModule } from "../whatsapp/whatsapp-provider.module";

@Module({
  imports: [WhatsappProviderModule],
  controllers: [CampaignsController],
  providers: [TemplateService, CampaignService, CampaignProcessor],
})
export class CampaignsModule {}
