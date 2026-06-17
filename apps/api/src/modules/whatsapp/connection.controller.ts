import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  connectWhatsappSchema,
  disconnectWhatsappSchema,
  Role,
  type ConnectWhatsappInput,
  type DisconnectWhatsappInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { WhatsappConnectionService } from "./whatsapp-connection.service";

@Controller("whatsapp/connection")
@UseGuards(JwtAuthGuard)
export class ConnectionController {
  constructor(private readonly connection: WhatsappConnectionService) {}

  // Lista de números (canales) conectados.
  @Get()
  async list() {
    const channels = await this.connection.listChannels();
    return { channels };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async connect(
    @Body(new ZodValidationPipe(connectWhatsappSchema))
    body: ConnectWhatsappInput,
  ) {
    const channels = await this.connection.connect(body);
    return { channels };
  }

  @Post("disconnect")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async disconnect(
    @Body(new ZodValidationPipe(disconnectWhatsappSchema))
    body: DisconnectWhatsappInput,
  ) {
    const channels = await this.connection.disconnect(body.phoneNumberId);
    return { channels };
  }
}
