"use client";

import type {
  AgentConfigDto,
  AgentDto,
  AiMode,
  AiSuggestion,
  IngestKnowledgeInput,
  KnowledgeDocDto,
  KnowledgeHit,
  UpdateAgentConfigInput,
  ContactDto,
  ConversationDto,
  ConversationFilter,
  ConversationStatus,
  CreateDealInput,
  DealDto,
  MessageDto,
  NoteDto,
  PipelineDto,
  SendMessageInput,
  ConnectWhatsappInput,
  WhatsappChannel,
} from "@crm/shared";

// Fetchers del lado del cliente: llaman al BFF (mismo origen, cookie httpOnly).

export async function fetchConversations(
  filter: ConversationFilter = "all",
  status?: ConversationStatus,
): Promise<ConversationDto[]> {
  const sp = new URLSearchParams({ filter });
  if (status) sp.set("status", status);
  const res = await fetch(`/api/bff/conversations?${sp.toString()}`);
  if (!res.ok) throw new Error("No se pudieron cargar las conversaciones");
  return res.json();
}

export async function assignConversation(
  conversationId: string,
  agentId: string | null,
): Promise<ConversationDto> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) throw new Error("No se pudo asignar");
  return res.json();
}

export async function setConversationStatus(
  conversationId: string,
  status: ConversationStatus,
): Promise<ConversationDto> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("No se pudo cambiar el estado");
  return res.json();
}

export async function setAiMode(
  conversationId: string,
  mode: AiMode,
): Promise<ConversationDto> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/ai-mode`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error("No se pudo cambiar el modo IA");
  return res.json();
}

export async function fetchNotes(conversationId: string): Promise<NoteDto[]> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/notes`);
  if (!res.ok) throw new Error("No se pudieron cargar las notas");
  return res.json();
}

export async function addNote(
  conversationId: string,
  body: string,
): Promise<NoteDto> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error("No se pudo agregar la nota");
  return res.json();
}

export async function fetchAgents(): Promise<AgentDto[]> {
  const res = await fetch("/api/bff/agents");
  if (!res.ok) throw new Error("No se pudieron cargar los agentes");
  return res.json();
}

// ── Configuración del agente IA ──────────────────────────────
export async function fetchAgentConfig(): Promise<AgentConfigDto> {
  const res = await fetch("/api/bff/agent-config");
  if (!res.ok) throw new Error("No se pudo cargar la configuración del agente");
  return res.json();
}

export async function updateAgentConfig(
  input: UpdateAgentConfigInput,
): Promise<AgentConfigDto> {
  const res = await fetch("/api/bff/agent-config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo guardar la configuración");
  }
  return res.json();
}

// ── Conexión de WhatsApp ─────────────────────────────────────
export async function fetchWhatsappChannels(): Promise<WhatsappChannel[]> {
  const res = await fetch("/api/bff/whatsapp/connection");
  if (!res.ok) throw new Error("No se pudo obtener el estado de WhatsApp");
  const data = (await res.json()) as { channels: WhatsappChannel[] };
  return data.channels ?? [];
}

export async function connectWhatsapp(
  input: ConnectWhatsappInput,
): Promise<WhatsappChannel[]> {
  const res = await fetch("/api/bff/whatsapp/connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo conectar WhatsApp");
  }
  const data = (await res.json()) as { channels: WhatsappChannel[] };
  return data.channels ?? [];
}

export async function disconnectWhatsapp(
  phoneNumberId: string,
): Promise<WhatsappChannel[]> {
  const res = await fetch("/api/bff/whatsapp/connection/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumberId }),
  });
  if (!res.ok) throw new Error("No se pudo desconectar");
  const data = (await res.json()) as { channels: WhatsappChannel[] };
  return data.channels ?? [];
}

// ── Base de conocimiento (RAG) ───────────────────────────────
export async function fetchKnowledge(): Promise<KnowledgeDocDto[]> {
  const res = await fetch("/api/bff/knowledge");
  if (!res.ok) throw new Error("No se pudo cargar la base de conocimiento");
  return res.json();
}

export async function ingestKnowledge(
  input: IngestKnowledgeInput,
): Promise<KnowledgeDocDto> {
  const res = await fetch("/api/bff/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo guardar el documento");
  }
  return res.json();
}

export async function deleteKnowledge(id: string): Promise<void> {
  const res = await fetch(`/api/bff/knowledge/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el documento");
}

export async function searchKnowledge(q: string): Promise<KnowledgeHit[]> {
  const res = await fetch(`/api/bff/knowledge/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("La búsqueda falló");
  return res.json();
}

// ── IA (copilot) ─────────────────────────────────────────────
export async function suggestReply(
  conversationId: string,
): Promise<AiSuggestion> {
  const res = await fetch(
    `/api/bff/conversations/${conversationId}/ai/suggest`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("La IA no pudo generar una sugerencia");
  return res.json();
}

export async function fetchMessages(
  conversationId: string,
): Promise<MessageDto[]> {
  const res = await fetch(`/api/bff/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error("No se pudieron cargar los mensajes");
  return res.json();
}

export async function sendMessage(input: SendMessageInput): Promise<MessageDto> {
  const res = await fetch("/api/bff/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const msg = Array.isArray(body?.message)
      ? body?.message.join(", ")
      : body?.message;
    throw new Error(msg ?? "No se pudo enviar el mensaje");
  }
  return res.json();
}

// ── Pipeline ─────────────────────────────────────────────────
export async function fetchPipeline(): Promise<PipelineDto> {
  const res = await fetch("/api/bff/pipeline");
  if (!res.ok) throw new Error("No se pudo cargar el pipeline");
  return res.json();
}

export async function createDeal(input: CreateDealInput): Promise<DealDto> {
  const res = await fetch("/api/bff/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo crear el deal");
  return res.json();
}

export async function moveDeal(
  dealId: string,
  stageId: string,
): Promise<DealDto> {
  const res = await fetch(`/api/bff/deals/${dealId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stageId }),
  });
  if (!res.ok) throw new Error("No se pudo mover el deal");
  return res.json();
}

export async function fetchContacts(search = ""): Promise<ContactDto[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/bff/contacts${qs}`);
  if (!res.ok) throw new Error("No se pudieron cargar los contactos");
  return res.json();
}

export async function fetchRealtimeToken(): Promise<string> {
  const res = await fetch("/api/bff/realtime-token");
  if (!res.ok) throw new Error("No se pudo obtener el token de realtime");
  const data = (await res.json()) as { token: string };
  return data.token;
}
