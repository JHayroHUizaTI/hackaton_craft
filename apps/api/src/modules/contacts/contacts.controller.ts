import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  updateContactSchema,
  type ContactDto,
  type ContactListItem,
  type UpdateContactInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  // Autocompletar (id/name/phone) — lo usa el pipeline.
  @Get()
  async list(@Query("search") search?: string): Promise<ContactDto[]> {
    const rows = await this.prisma.contact.findMany({
      where: search ? this.searchWhere(search) : undefined,
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    });
    return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  }

  // Directorio completo para la sección de Contactos.
  @Get("directory")
  async directory(
    @Query("search") search?: string,
  ): Promise<ContactListItem[]> {
    const rows = await this.prisma.contact.findMany({
      where: search ? this.searchWhere(search) : undefined,
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 200,
      include: { tags: { include: { tag: true } }, source: true },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      optIn: c.optIn,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      tags: c.tags.map((ct) => ({ name: ct.tag.name, color: ct.tag.color })),
      source: c.source
        ? { id: c.source.id, name: c.source.name, color: c.source.color }
        : null,
    }));
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateContactSchema)) body: UpdateContactInput,
  ): Promise<{ ok: true }> {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Contacto no encontrado");
    await this.prisma.contact.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.optIn !== undefined ? { optIn: body.optIn } : {}),
      },
    });
    return { ok: true };
  }

  private searchWhere(search: string) {
    return {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
      ],
    };
  }
}
