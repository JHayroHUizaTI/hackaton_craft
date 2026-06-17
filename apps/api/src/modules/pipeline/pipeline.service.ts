import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type {
  CreateDealInput,
  DealDto,
  MoveDealInput,
  PipelineDto,
  UpdateDealInput,
} from "@crm/shared";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async getPipeline(): Promise<PipelineDto> {
    const [stages, deals] = await Promise.all([
      this.prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
      this.prisma.deal.findMany({
        orderBy: { createdAt: "desc" },
        include: { contact: true },
      }),
    ]);
    return {
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        isWon: s.isWon,
        isLost: s.isLost,
      })),
      deals: deals.map((d) => this.toDealDto(d)),
    };
  }

  async createDeal(input: CreateDealInput): Promise<DealDto> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado");

    const stageId =
      input.stageId ??
      (await this.prisma.pipelineStage.findFirst({ orderBy: { order: "asc" } }))
        ?.id;
    if (!stageId) throw new BadRequestException("No hay etapas configuradas");

    const deal = await this.prisma.deal.create({
      data: {
        contactId: input.contactId,
        stageId,
        title: input.title,
        value: input.value,
        currency: input.currency,
      },
      include: { contact: true },
    });
    this.events.emit("pipeline.changed", { dealId: deal.id });
    return this.toDealDto(deal);
  }

  async moveDeal(id: string, input: MoveDealInput): Promise<DealDto> {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id: input.stageId },
    });
    if (!stage) throw new BadRequestException("Etapa inválida");

    const deal = await this.prisma.deal
      .update({
        where: { id },
        data: { stageId: input.stageId },
        include: { contact: true },
      })
      .catch(() => {
        throw new NotFoundException("Deal no encontrado");
      });
    this.events.emit("pipeline.changed", { dealId: deal.id });
    return this.toDealDto(deal);
  }

  async updateDeal(id: string, input: UpdateDealInput): Promise<DealDto> {
    const deal = await this.prisma.deal
      .update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.value !== undefined ? { value: input.value } : {}),
        },
        include: { contact: true },
      })
      .catch(() => {
        throw new NotFoundException("Deal no encontrado");
      });
    this.events.emit("pipeline.changed", { dealId: deal.id });
    return this.toDealDto(deal);
  }

  private toDealDto(d: {
    id: string;
    title: string;
    value: unknown;
    currency: string;
    stageId: string;
    createdAt: Date;
    contact: { id: string; name: string | null; phone: string };
  }): DealDto {
    return {
      id: d.id,
      title: d.title,
      value: d.value === null ? null : Number(d.value),
      currency: d.currency,
      stageId: d.stageId,
      contact: { id: d.contact.id, name: d.contact.name, phone: d.contact.phone },
      createdAt: d.createdAt.toISOString(),
    };
  }
}
