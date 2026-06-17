import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AgentDto } from "@crm/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Controller("agents")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listAgents(): Promise<AgentDto[]> {
    const rows = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    return rows;
  }
}
