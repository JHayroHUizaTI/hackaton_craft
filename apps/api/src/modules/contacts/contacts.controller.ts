import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { ContactDto } from "@crm/shared";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("search") search?: string): Promise<ContactDto[]> {
    const rows = await this.prisma.contact.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    });
    return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  }
}
