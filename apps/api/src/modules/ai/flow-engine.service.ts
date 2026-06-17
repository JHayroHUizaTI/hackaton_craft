import { Injectable, Logger } from "@nestjs/common";
import {
  AiMode,
  ConversationStatus,
  MessageAuthor,
  MessageType,
  type FlowEdge,
  type FlowNode,
} from "@crm/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { MessagingService } from "../messaging/messaging.service";
import { AutopilotService } from "./autopilot.service";

const MAX_STEPS = 50; // cortafuegos anti-bucle

type Vars = Record<string, string>;

/**
 * Motor de ejecución de flujos visuales. Recorre el grafo (nodos + aristas)
 * por cada conversación, manteniendo el estado en FlowSession:
 *  - envía mensajes, hace preguntas (y espera la respuesta), ramifica por
 *    condición y ejecuta acciones (IA, handoff, etiqueta, mover deal).
 * Tiene prioridad sobre el autopilot mientras la sesión está activa.
 */
@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger("FlowEngine");

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly autopilot: AutopilotService,
  ) {}

  // ── Conversación nueva: ¿arranca un flujo "al iniciar"? ─────
  async onCreated(conversationId: string): Promise<boolean> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!convo || !convo.contact.optIn) return false;

    const flow = await this.findFlow(convo.channelId, "conversation_start");
    if (!flow) return false;
    await this.startFlow(flow, conversationId, "");
    return true;
  }

  // ── Entrante: reanudar sesión o disparar flujo por palabra ──
  // Devuelve true si el flujo manejó el mensaje (el autopilot no debe correr).
  async onInbound(conversationId: string): Promise<boolean> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!convo || !convo.contact.optIn) return false;

    const text = await this.lastInboundText(conversationId);
    const session = await this.prisma.flowSession.findUnique({
      where: { conversationId },
    });

    // Sesión esperando respuesta a una pregunta → reanudar.
    if (session && session.status === "running" && session.currentNodeId) {
      const flow = await this.loadFlow(session.flowId);
      if (!flow) return false;
      await this.resume(flow, conversationId, session.currentNodeId, text, {
        ...((session.variables as Vars | null) ?? {}),
      });
      return true;
    }

    // Sin sesión activa → ¿algún flujo por palabra clave coincide?
    const flow = await this.findFlow(convo.channelId, "keyword", text);
    if (flow) {
      await this.startFlow(flow, conversationId, text);
      return true;
    }
    return false;
  }

  // ── Arranque / reanudación ──────────────────────────────────
  private async startFlow(
    flow: FlowRow,
    conversationId: string,
    lastText: string,
  ): Promise<void> {
    await this.prisma.flowSession.upsert({
      where: { conversationId },
      create: {
        conversationId,
        flowId: flow.id,
        variables: {},
        status: "running",
      },
      update: {
        flowId: flow.id,
        variables: {},
        status: "running",
        currentNodeId: null,
      },
    });
    const start = flow.nodes.find((n) => n.type === "start");
    const firstId = start
      ? this.nextNodeId(flow.edges, start.id)
      : (flow.nodes[0]?.id ?? null);
    await this.walk(flow, conversationId, firstId, lastText, {});
    this.logger.log(`Flujo "${flow.name}" iniciado en ${conversationId}`);
  }

  private async resume(
    flow: FlowRow,
    conversationId: string,
    waitingNodeId: string,
    text: string,
    vars: Vars,
  ): Promise<void> {
    const node = flow.nodes.find((n) => n.id === waitingNodeId);
    // Guardar la respuesta en la variable indicada por la pregunta.
    if (node?.type === "askQuestion" && node.data.variable) {
      vars[node.data.variable] = text;
    }
    const nextId = node ? this.nextNodeId(flow.edges, node.id) : null;
    await this.walk(flow, conversationId, nextId, text, vars);
  }

  // ── Recorrido del grafo ─────────────────────────────────────
  private async walk(
    flow: FlowRow,
    conversationId: string,
    startId: string | null,
    lastText: string,
    vars: Vars,
  ): Promise<void> {
    let current = startId;
    let steps = 0;

    while (current && steps < MAX_STEPS) {
      steps++;
      const node = flow.nodes.find((n) => n.id === current);
      if (!node) break;

      if (node.type === "start") {
        current = this.nextNodeId(flow.edges, node.id);
        continue;
      }

      if (node.type === "sendMessage") {
        await this.send(conversationId, this.interpolate(node.data.text, vars));
        current = this.nextNodeId(flow.edges, node.id);
        continue;
      }

      if (node.type === "askQuestion") {
        await this.send(conversationId, this.interpolate(node.data.text, vars));
        // Esperar la respuesta: persistir el nodo actual y parar.
        await this.persist(conversationId, node.id, vars, "running");
        return;
      }

      if (node.type === "condition") {
        const handle = this.evalCondition(node, lastText);
        current = this.nextNodeId(flow.edges, node.id, handle);
        continue;
      }

      if (node.type === "action") {
        const stop = await this.execAction(node, conversationId, vars);
        if (stop) {
          await this.persist(conversationId, null, vars, "stopped");
          return;
        }
        current = this.nextNodeId(flow.edges, node.id);
        continue;
      }

      break;
    }

    // Fin del flujo (sin más nodos): completado.
    await this.persist(conversationId, null, vars, "completed");
  }

  // ── Acciones del nodo "action" ──────────────────────────────
  // Devuelve true si el flujo debe detenerse tras la acción.
  private async execAction(
    node: FlowNode,
    conversationId: string,
    vars: Vars,
  ): Promise<boolean> {
    const action = node.data.action;
    if (action === "ai") {
      await this.messaging.setAiMode(conversationId, AiMode.AUTOPILOT);
      // Persistir antes de delegar para no pisar el estado.
      await this.persist(conversationId, null, vars, "stopped");
      await this.autopilot.run(conversationId);
      return true;
    }
    if (action === "handoff") {
      await this.messaging.setStatus(conversationId, ConversationStatus.PENDING);
      return true;
    }
    if (action === "tag" && node.data.tag?.trim()) {
      await this.applyTag(conversationId, node.data.tag.trim());
      return false;
    }
    if (action === "move_deal" && node.data.stageId) {
      await this.moveDeal(conversationId, node.data.stageId);
      return false;
    }
    return false;
  }

  private async applyTag(conversationId: string, name: string): Promise<void> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { contactId: true },
    });
    if (!convo) return;
    const tag = await this.prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    await this.prisma.contactTag
      .create({ data: { contactId: convo.contactId, tagId: tag.id } })
      .catch(() => undefined); // ya existía
  }

  private async moveDeal(conversationId: string, stageId: string): Promise<void> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { contactId: true },
    });
    if (!convo) return;
    const deal = await this.prisma.deal.findFirst({
      where: { contactId: convo.contactId },
      orderBy: { updatedAt: "desc" },
    });
    if (deal) {
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: { stageId },
      });
    }
  }

  // ── Utilidades del grafo ────────────────────────────────────
  private nextNodeId(
    edges: FlowEdge[],
    nodeId: string,
    handle?: string,
  ): string | null {
    const outgoing = edges.filter((e) => e.source === nodeId);
    if (handle) {
      const byHandle = outgoing.find((e) => e.sourceHandle === handle);
      if (byHandle) return byHandle.target;
      // "else": acepta la rama explícita o la arista sin handle.
      const fallback = outgoing.find(
        (e) => e.sourceHandle === "else" || !e.sourceHandle,
      );
      return fallback?.target ?? null;
    }
    return outgoing[0]?.target ?? null;
  }

  private evalCondition(node: FlowNode, text: string): string {
    const t = text.toLowerCase();
    const branches = node.data.branches ?? [];
    const hit = branches.find((b) =>
      b.keywords.some((k) => t.includes(k.toLowerCase())),
    );
    return hit?.id ?? "else";
  }

  private interpolate(text: string | undefined, vars: Vars): string {
    if (!text) return "";
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
  }

  private async send(conversationId: string, text: string): Promise<void> {
    if (!text.trim()) return;
    await this.messaging.queueOutbound(
      { conversationId, type: MessageType.TEXT, text },
      MessageAuthor.AI,
    );
  }

  private async persist(
    conversationId: string,
    currentNodeId: string | null,
    vars: Vars,
    status: string,
  ): Promise<void> {
    await this.prisma.flowSession.update({
      where: { conversationId },
      data: {
        currentNodeId,
        variables: vars as unknown as Prisma.InputJsonValue,
        status,
      },
    });
  }

  private async lastInboundText(conversationId: string): Promise<string> {
    const m = await this.prisma.message.findFirst({
      where: { conversationId, direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    });
    return m?.content ?? "";
  }

  // ── Selección de flujo ──────────────────────────────────────
  private async findFlow(
    channelId: string | null,
    triggerType: "conversation_start" | "keyword",
    text?: string,
  ): Promise<FlowRow | null> {
    const rows = await this.prisma.flow.findMany({
      where: {
        isActive: true,
        triggerType,
        OR: [{ channelId }, { channelId: null }],
      },
      orderBy: { channelId: "desc" }, // prioriza el específico del canal
    });
    const flows = rows.map((r) => this.toRow(r));
    if (triggerType === "keyword") {
      const t = (text ?? "").toLowerCase();
      if (!t) return null;
      return (
        flows.find((f) =>
          f.triggerKeywords.some((k) => t.includes(k.toLowerCase())),
        ) ?? null
      );
    }
    return flows[0] ?? null;
  }

  private async loadFlow(flowId: string): Promise<FlowRow | null> {
    const f = await this.prisma.flow.findUnique({ where: { id: flowId } });
    return f && f.isActive ? this.toRow(f) : null;
  }

  private toRow(f: {
    id: string;
    name: string;
    triggerKeywords: string[];
    nodes: unknown;
    edges: unknown;
  }): FlowRow {
    return {
      id: f.id,
      name: f.name,
      triggerKeywords: f.triggerKeywords,
      nodes: (f.nodes as FlowNode[] | null) ?? [],
      edges: (f.edges as FlowEdge[] | null) ?? [],
    };
  }
}

interface FlowRow {
  id: string;
  name: string;
  triggerKeywords: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
}
