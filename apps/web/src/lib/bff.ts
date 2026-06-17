"use client";

import type {
  AgentConfigDto,
  AgentDto,
  AiMode,
  AiSuggestion,
  SessionDto,
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
  BotsResponse,
  BotDto,
  CreateBotInput,
  UpdateBotInput,
  FlowsResponse,
  FlowDto,
  CreateFlowInput,
  UpdateFlowInput,
  TemplateDto,
  CreateTemplateInput,
  UpdateTemplateInput,
  CampaignDto,
  CampaignMeta,
  CreateCampaignInput,
  UpdateCampaignInput,
  AudiencePreview,
  SourceDto,
  CreateSourceInput,
  UpdateSourceInput,
  SellersResponse,
  ProductDto,
  CreateProductInput,
  UpdateProductInput,
  ContactListItem,
  UpdateContactInput,
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

// ── Sesiones / dispositivos ──────────────────────────────────
export async function fetchSessions(): Promise<SessionDto[]> {
  const res = await fetch("/api/bff/auth/sessions");
  if (!res.ok) throw new Error("No se pudieron cargar las sesiones");
  return res.json();
}

export async function revokeSession(id: string): Promise<void> {
  const res = await fetch(`/api/bff/auth/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo cerrar la sesión");
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

// ── Bots (agentes IA) ────────────────────────────────────────
export async function fetchBots(): Promise<BotsResponse> {
  const res = await fetch("/api/bff/bots");
  if (!res.ok) throw new Error("No se pudieron cargar los bots");
  return res.json();
}

export async function createBot(input: CreateBotInput): Promise<BotDto> {
  const res = await fetch("/api/bff/bots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear el bot");
  }
  return res.json();
}

export async function updateBot(
  id: string,
  input: UpdateBotInput,
): Promise<BotDto> {
  const res = await fetch(`/api/bff/bots/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo guardar el bot");
  }
  return res.json();
}

export async function deleteBot(id: string): Promise<void> {
  const res = await fetch(`/api/bff/bots/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo eliminar el bot");
  }
}

// ── Flujos (constructor visual) ──────────────────────────────
export async function fetchFlows(): Promise<FlowsResponse> {
  const res = await fetch("/api/bff/flows");
  if (!res.ok) throw new Error("No se pudieron cargar los flujos");
  return res.json();
}

export async function fetchFlow(id: string): Promise<FlowDto> {
  const res = await fetch(`/api/bff/flows/${id}`);
  if (!res.ok) throw new Error("No se pudo cargar el flujo");
  return res.json();
}

export async function createFlow(input: CreateFlowInput): Promise<FlowDto> {
  const res = await fetch("/api/bff/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear el flujo");
  }
  return res.json();
}

export async function updateFlow(
  id: string,
  input: UpdateFlowInput,
): Promise<FlowDto> {
  const res = await fetch(`/api/bff/flows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo guardar el flujo");
  }
  return res.json();
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await fetch(`/api/bff/flows/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el flujo");
}

// ── Plantillas ───────────────────────────────────────────────
export async function fetchTemplates(): Promise<TemplateDto[]> {
  const res = await fetch("/api/bff/templates");
  if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
  return res.json();
}

export async function createTemplate(
  input: CreateTemplateInput,
): Promise<TemplateDto> {
  const res = await fetch("/api/bff/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear la plantilla");
  }
  return res.json();
}

export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
): Promise<TemplateDto> {
  const res = await fetch(`/api/bff/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo guardar la plantilla");
  return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/bff/templates/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo eliminar la plantilla");
  }
}

// ── Campañas ─────────────────────────────────────────────────
export async function fetchCampaigns(): Promise<CampaignDto[]> {
  const res = await fetch("/api/bff/campaigns");
  if (!res.ok) throw new Error("No se pudieron cargar las campañas");
  return res.json();
}

export async function fetchCampaignMeta(): Promise<CampaignMeta> {
  const res = await fetch("/api/bff/campaigns/meta");
  if (!res.ok) throw new Error("No se pudieron cargar los datos de campaña");
  return res.json();
}

export async function fetchAudiencePreview(
  tagIds: string[],
): Promise<AudiencePreview> {
  const res = await fetch(
    `/api/bff/campaigns/audience?tagIds=${encodeURIComponent(tagIds.join(","))}`,
  );
  if (!res.ok) throw new Error("No se pudo calcular la audiencia");
  return res.json();
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CampaignDto> {
  const res = await fetch("/api/bff/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear la campaña");
  }
  return res.json();
}

export async function updateCampaign(
  id: string,
  input: UpdateCampaignInput,
): Promise<CampaignDto> {
  const res = await fetch(`/api/bff/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo guardar la campaña");
  return res.json();
}

export async function launchCampaign(id: string): Promise<CampaignDto> {
  const res = await fetch(`/api/bff/campaigns/${id}/launch`, { method: "POST" });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo lanzar la campaña");
  }
  return res.json();
}

export async function cancelCampaign(id: string): Promise<CampaignDto> {
  const res = await fetch(`/api/bff/campaigns/${id}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error("No se pudo cancelar la campaña");
  return res.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`/api/bff/campaigns/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo eliminar la campaña");
  }
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

export async function reactToMessage(
  messageId: string,
  emoji: string,
): Promise<MessageDto> {
  const res = await fetch("/api/bff/messages/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, emoji }),
  });
  if (!res.ok) throw new Error("No se pudo reaccionar");
  return res.json();
}

// ── Fuentes y vendedores ─────────────────────────────────────
export async function fetchSources(): Promise<SourceDto[]> {
  const res = await fetch("/api/bff/sources");
  if (!res.ok) throw new Error("No se pudieron cargar las fuentes");
  return res.json();
}

export async function createSource(input: CreateSourceInput): Promise<SourceDto> {
  const res = await fetch("/api/bff/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear la fuente");
  }
  return res.json();
}

export async function updateSource(
  id: string,
  input: UpdateSourceInput,
): Promise<SourceDto> {
  const res = await fetch(`/api/bff/sources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo guardar la fuente");
  return res.json();
}

export async function deleteSource(id: string): Promise<void> {
  const res = await fetch(`/api/bff/sources/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar la fuente");
}

export async function fetchSellers(): Promise<SellersResponse> {
  const res = await fetch("/api/bff/sellers");
  if (!res.ok) throw new Error("No se pudieron cargar los vendedores");
  return res.json();
}

export async function assignSellerSources(
  sellerId: string,
  sourceIds: string[],
): Promise<void> {
  const res = await fetch(`/api/bff/sellers/${sellerId}/sources`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceIds }),
  });
  if (!res.ok) throw new Error("No se pudo asignar");
}

export async function setContactSource(
  contactId: string,
  sourceId: string | null,
): Promise<void> {
  const res = await fetch("/api/bff/contacts/source", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactId, sourceId }),
  });
  if (!res.ok) throw new Error("No se pudo cambiar la fuente");
}

// ── Contactos (directorio) ───────────────────────────────────
export async function fetchContactDirectory(
  search = "",
): Promise<ContactListItem[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/bff/contacts/directory${qs}`);
  if (!res.ok) throw new Error("No se pudieron cargar los contactos");
  return res.json();
}

export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<void> {
  const res = await fetch(`/api/bff/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo guardar el contacto");
}

// ── Productos ────────────────────────────────────────────────
export async function fetchProducts(search = ""): Promise<ProductDto[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/bff/products${qs}`);
  if (!res.ok) throw new Error("No se pudieron cargar los productos");
  return res.json();
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ProductDto> {
  const res = await fetch("/api/bff/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(b?.message ?? "No se pudo crear el producto");
  }
  return res.json();
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductDto> {
  const res = await fetch(`/api/bff/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("No se pudo guardar el producto");
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`/api/bff/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el producto");
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
