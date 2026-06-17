import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateSourceInput,
  SellerDto,
  SourceDto,
  UpdateSourceInput,
} from "@crm/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class SourceService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Fuentes ──────────────────────────────────────────────────
  async list(): Promise<SourceDto[]> {
    const rows = await this.prisma.source.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true } } },
    });
    return rows.map((s) => this.toDto(s));
  }

  async create(input: CreateSourceInput): Promise<SourceDto> {
    const s = await this.prisma.source.create({
      data: { name: input.name, color: input.color },
      include: { _count: { select: { contacts: true } } },
    });
    return this.toDto(s);
  }

  async update(id: string, input: UpdateSourceInput): Promise<SourceDto> {
    const existing = await this.prisma.source.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Fuente no encontrada");
    const s = await this.prisma.source.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
      include: { _count: { select: { contacts: true } } },
    });
    return this.toDto(s);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const s = await this.prisma.source.findUnique({ where: { id } });
    if (!s) throw new NotFoundException("Fuente no encontrada");
    await this.prisma.source.delete({ where: { id } });
    return { ok: true };
  }

  // ── Vendedores ───────────────────────────────────────────────
  async listSellers(): Promise<{ sellers: SellerDto[]; sources: SourceDto[] }> {
    const [users, sources] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          sources: { select: { sourceId: true } },
        },
      }),
      this.list(),
    ]);
    return {
      sellers: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        sourceIds: u.sources.map((s) => s.sourceId),
      })),
      sources,
    };
  }

  // Reemplaza las fuentes asignadas a un vendedor.
  async assignSources(userId: string, sourceIds: string[]): Promise<SellerDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Vendedor no encontrado");
    await this.prisma.$transaction([
      this.prisma.userSource.deleteMany({ where: { userId } }),
      this.prisma.userSource.createMany({
        data: sourceIds.map((sourceId) => ({ userId, sourceId })),
        skipDuplicates: true,
      }),
    ]);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sourceIds,
    };
  }

  // ── Fuente de un contacto ────────────────────────────────────
  async setContactSource(
    contactId: string,
    sourceId: string | null,
  ): Promise<{ ok: true }> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado");
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { sourceId },
    });
    return { ok: true };
  }

  // Fuentes asignadas a un usuario (para filtrar su bandeja).
  async sourceIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userSource.findMany({
      where: { userId },
      select: { sourceId: true },
    });
    return rows.map((r) => r.sourceId);
  }

  private toDto(s: {
    id: string;
    name: string;
    color: string | null;
    createdAt: Date;
    _count: { contacts: number };
  }): SourceDto {
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      contactCount: s._count.contacts,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
