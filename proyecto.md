# Plan de Desarrollo: CRM para WhatsApp con Agentes IA

> Especificación para desarrollo asistido por IA. Seguir las fases en orden.
> El CRM está diseñado desde su núcleo para operar con **agentes de IA** que atienden conversaciones,
> ejecutan acciones del CRM mediante herramientas (tool use) y escalan a humanos cuando corresponde.

## Stack

- **Backend:** NestJS (TypeScript) + Prisma + PostgreSQL + Redis/BullMQ + Socket.io
- **Frontend:** Next.js (App Router, TypeScript) + Tailwind + shadcn/ui + TanStack Query (REST, no GraphQL)
- **Auth:** NestJS es la autoridad del JWT y dueño de `User`. Access token corto (~15 min) + **refresh token rotativo con detección de reuso**; cada login es una **`Session` por dispositivo** (revocable). NextAuth (Auth.js) en `apps/web` envuelve este flujo para la sesión web (cookie); la app móvil llama directo a los mismos endpoints `/auth/*`. Firma HS256 hoy; RS256/JWKS si aparecen varios servicios verificando tokens.
- **WhatsApp:** Meta WhatsApp Business Cloud API (oficial). Prohibido whatsapp-web.js/Baileys.
- **IA:** SDK oficial de Anthropic (`@anthropic-ai/sdk`), modelo **`claude-opus-4-8`**.
  - Tool use (bucle agéntico manual con aprobación humana en acciones sensibles).
  - Adaptive thinking + parámetro `effort` para calibrar costo/calidad.
  - Prompt caching del system prompt y la base de conocimiento (RAG).
  - Salidas estructuradas (`output_config.format`) para clasificación (intención, sentimiento, decisión de escalado).
  - Búsqueda vectorial (pgvector) para RAG sobre documentación del negocio.
- **Monorepo:** **Turborepo** — `apps/api`, `apps/web`, `apps/mobile` (futuro), `packages/shared`.
- **Contrato multi-cliente:** **Zod** en `packages/shared` como fuente única de validación (la usan el `ValidationPipe` de Nest y los formularios de web/móvil); **OpenAPI** autogenerado → **cliente tipado** que consumen web y móvil; API versionada `/api/v1`; **idempotency keys** en mutaciones.
- **Móvil (Fase 7):** Expo (React Native) + Expo Router + EAS (Build/Submit/Update OTA), reutiliza TanStack Query, cliente tipado y esquemas Zod.

## Arquitectura

### Backend — Clean Architecture (monolito modular)

```
apps/api/src/
├── modules/
│   ├── whatsapp/      # webhook, adapter WhatsAppProvider, medios
│   ├── messaging/     # conversaciones, mensajes, ventana 24h
│   ├── contacts/      # contactos, etiquetas, opt-in/opt-out
│   ├── pipeline/      # embudo kanban, deals
│   ├── campaigns/     # plantillas, envíos masivos
│   ├── auth/          # usuarios, roles (admin/agente), JWT
│   ├── ai/            # ⭐ agentes IA: orquestador, tools, RAG, guardrails, memoria
│   └── analytics/     # métricas (incluye métricas de IA)
├── common/            # guards, filters, DTOs
└── infra/             # prisma, redis, bullmq, socket.io, s3, anthropic
```

Reglas:
- Cada módulo: controller → service → repository. La lógica de negocio vive en services y no importa Prisma ni la API de Meta directamente.
- La Cloud API se usa solo a través de la interfaz `WhatsAppProvider` (patrón Adapter).
- El LLM se usa solo a través de la interfaz `LLMProvider` (patrón Adapter) — implementación inicial `AnthropicProvider`. Permite cambiar de proveedor o de modelo sin tocar la lógica del agente.
- Eventos internos vía BullMQ: `message.received`, `message.status_changed`, `ai.reply_requested`, `ai.handoff_requested`.
- API y workers: mismo código, entrypoints separados. **El agente IA corre siempre en worker**, nunca en el hilo del webhook.

### Frontend — Atomic simplificado (3 niveles) + features

```
apps/web/src/
├── components/
│   ├── ui/            # shadcn/ui (Button, Input, Badge...)
│   └── shared/        # SearchBar, TagPicker, EmptyState
├── features/
│   ├── inbox/         # ConversationList, ChatWindow, MessageBubble, AiSuggestion, HandoffBanner
│   ├── contacts/
│   ├── pipeline/      # KanbanBoard, DealCard
│   ├── campaigns/
│   └── ai/            # AgentConfigForm, KnowledgeBaseManager, AiActivityLog, ToolCallTrace
├── app/               # páginas: solo composición. RSC/route handlers actúan como BFF: reenvían a NestJS
└── lib/api/           # cliente HTTP + hooks TanStack Query (componentes nunca hacen fetch directo)
```

**Rol de Next.js:** es el **cliente web**, no un segundo backend. Es frontend + un **BFF delgado** (Server Components / route handlers / server actions que reenvían a NestJS añadiendo el token). **No toca Prisma ni contiene lógica de negocio** — eso vive solo en NestJS, compartido por web y móvil. Ventaja exclusiva de la web: el access token vive en **cookie httpOnly** (NextAuth) y lo adjunta el servidor de Next; el JS del navegador nunca ve el JWT (inmune a XSS). Móvil guarda el token en SecureStore/Keychain y llama directo a la API.

## El Módulo de IA (`modules/ai`)

El módulo de IA es el corazón del CRM "preparado para agentes". Su responsabilidad es decidir, por cada
mensaje entrante, **si responde el agente IA, si sugiere una respuesta al humano, o si escala**, y ejecutar
la acción correspondiente con seguridad.

```
modules/ai/
├── agent.service.ts          # orquestador: arma el contexto, corre el bucle agéntico, decide handoff
├── llm.provider.ts           # interfaz LLMProvider (Adapter)
├── anthropic.provider.ts     # implementación con @anthropic-ai/sdk
├── tools/                    # herramientas que el agente puede invocar (tool use)
│   ├── registry.ts           # catálogo de tools + JSON Schemas
│   ├── search-contact.tool.ts
│   ├── update-contact.tool.ts
│   ├── create-deal.tool.ts
│   ├── move-deal-stage.tool.ts
│   ├── search-knowledge.tool.ts   # RAG sobre base de conocimiento
│   ├── schedule-followup.tool.ts
│   └── handoff-to-human.tool.ts    # escalado explícito
├── rag/
│   ├── knowledge.service.ts  # ingesta, chunking, embeddings (pgvector)
│   └── retriever.ts          # búsqueda por similitud
├── guardrails.service.ts     # ventana 24h, opt-out, PII, límites de gasto, validación de tools
├── memory.service.ts         # resumen/estado persistente por conversación
└── prompt/
    ├── system.ts             # system prompt base (cacheable)
    └── classifier.ts         # prompts de clasificación (intención/sentimiento/escalado)
```

### Modos de operación del agente (configurable por bandeja o por contacto)

| Modo | Comportamiento |
|---|---|
| `autopilot` | El agente responde y ejecuta acciones automáticamente dentro de sus límites. Escala solo si lo decide o si baja la confianza. |
| `copilot` | El agente **redacta** la respuesta y propone acciones; un humano aprueba/edita antes de enviar (human-in-the-loop). |
| `off` | Sin IA. Atención 100% humana. |

El modo se evalúa por conversación; un humano siempre puede tomar el control (`assigned_agent_id` pasa a un usuario) y eso pausa la IA.

### Bucle agéntico (tool use)

Se usa el **bucle agéntico manual** (no el tool-runner automático) porque las herramientas tienen efectos
de lado (mutan el CRM, envían mensajes) y requieren guardrails y, en `copilot`, aprobación humana.

```
1. Construir mensajes: system (cacheable) + base de conocimiento (cacheable) + historial + mensaje nuevo.
2. messages.create({ model: "claude-opus-4-8", thinking: { type: "adaptive" },
                     output_config: { effort: "medium" }, tools, messages, stream: true }).
3. Si stop_reason === "tool_use":
     - Validar cada tool_use con guardrails (permisos, ventana 24h, límites).
     - En modo copilot: encolar la acción para aprobación; no ejecutar aún.
     - En autopilot: ejecutar la tool, devolver tool_result, repetir desde 2.
4. Si stop_reason === "end_turn": enviar el texto final (autopilot) o mostrarlo como sugerencia (copilot).
5. Si stop_reason === "refusal": no enviar; registrar y escalar a humano.
6. Límite de iteraciones (p. ej. 6) para evitar bucles; al superarlo, escalar.
```

Notas técnicas:
- **Streaming** siempre (`stream: true` / `messages.stream()`), tanto por latencia como para evitar timeouts del SDK; usar `.finalMessage()` para obtener el mensaje completo.
- **Prompt caching:** marcar con `cache_control: { type: "ephemeral" }` el último bloque estable del system prompt y de la base de conocimiento. El historial volátil va después del último breakpoint.
- **Clasificación previa** (intención, sentimiento, urgencia, ¿requiere humano?) con `output_config.format` (JSON Schema) en una llamada barata para enrutar antes de generar la respuesta larga.
- Parsear `tool_use.input` siempre con `JSON.parse` (nunca match de strings).

## Modelo de Datos

| Entidad | Campos clave |
|---|---|
| Contact | phone (único), name, tags[], opt_in, last_message_at |
| Conversation | contact_id, assigned_agent_id, status (open/pending/closed), window_expires_at, **ai_mode (autopilot/copilot/off)**, **ai_paused_until** |
| Message | wa_message_id (único), direction, type, content, media_url, status, **author (contact/human/ai)** |
| User | email, password_hash, role (admin/agent) |
| Template | wa_template_id, name, status, variables |
| Campaign | template_id, segment, scheduled_at, métricas |
| Deal | contact_id, stage, value |
| **AgentConfig** | name, system_prompt, model, effort, enabled_tools[], max_iterations, escalation_rules, monthly_token_budget |
| **AiRun** | conversation_id, message_id, model, status (completed/escalated/refused/error), input_tokens, output_tokens, cost, latency_ms, confidence |
| **AiToolCall** | ai_run_id, tool_name, input(json), output(json), status (executed/pending_approval/rejected), approved_by |
| **KnowledgeDoc** | title, source, content, metadata |
| **KnowledgeChunk** | doc_id, content, embedding (vector pgvector), token_count |
| **AiMessage** | conversation_id, role (user/assistant/system/tool), content(json), thinking_blocks, created_at — historial completo que se replica al LLM |

`AiRun` + `AiToolCall` dan **trazabilidad total**: qué decidió la IA, qué herramientas usó, con qué entrada/salida, cuánto costó y quién aprobó.

## Reglas de Negocio Críticas

1. **Webhook:** responder 200 OK inmediato (<200ms), procesar en cola BullMQ. Validar firma `X-Hub-Signature-256`.
2. **Idempotencia:** índice único en `wa_message_id`; eventos duplicados se ignoran.
3. **Ventana 24h:** solo se envían mensajes libres si `window_expires_at > now()`; fuera de ventana, solo plantillas aprobadas. **El agente IA también está sujeto a esta regla**: si está fuera de ventana, no puede enviar texto libre; debe escalar o proponer una plantilla. El frontend bloquea el input y sugiere plantilla.
4. **Opt-out:** mensajes entrantes "BAJA" o "STOP" marcan `opt_in = false` y excluyen de campañas. La IA nunca contacta a un `opt_in = false`.
5. **Campañas:** envío por lotes con throttling en BullMQ; respetar rate limits de Meta.
6. **Guardrails de IA (obligatorios, en `guardrails.service.ts`):**
   - **Pausa humana:** si un humano está asignado o escribió en los últimos N minutos, la IA no responde (`ai_paused_until`).
   - **Aprobación de acciones:** en `copilot`, ninguna tool con efecto de lado se ejecuta sin aprobación humana.
   - **Escalado:** la IA escala ante baja confianza, sentimiento negativo/enojo, solicitud explícita de humano, tema fuera de alcance (`refusal`), o tras superar `max_iterations`.
   - **Presupuesto:** límite de tokens/costo por conversación y por mes (`monthly_token_budget`); al alcanzarlo, degradar a `copilot`/`off`.
   - **PII y seguridad:** las tools validan y sanitizan su entrada; nunca se exponen secretos ni tokens al prompt.
   - **Refusals:** comprobar `stop_reason === "refusal"` **antes** de leer `content`; nunca enviar una respuesta rechazada — registrar y escalar.

## Fases de Desarrollo

### Fase 1 — Núcleo de mensajería
- Setup monorepo, Prisma + migraciones del modelo de datos.
- Webhook (GET verificación + POST eventos) → cola → workers.
- Recepción de mensajes y estados; envío de texto/imagen/documento con reintentos.
- Descarga de medios entrantes a almacenamiento.

### Fase 2 — Panel de agentes (MVP)
- Auth: endpoints `/auth/login` `/auth/refresh` `/auth/logout` `/auth/sessions` en NestJS (bcrypt, Prisma) con access token corto + refresh token rotativo (detección de reuso) y `Session` por dispositivo. NextAuth (Credentials) en `apps/web` envuelve el flujo; `AuthGuard` por roles en NestJS. Endpoints diseñados para servir también a la app móvil.
- Bandeja: lista de conversaciones con filtros (no asignadas / mías / por estado).
- Chat en tiempo real (Socket.io): historial paginado, envío, respuestas rápidas.
- Asignación de conversaciones, estados, notas internas.
- Indicador y bloqueo por ventana de 24h.
- Contactos: perfil, etiquetas, historial.

### Fase 3 — Pipeline y plantillas
- Kanban del embudo con drag & drop.
- CRUD de plantillas sincronizado con Meta (estado approved/rejected).
- Envío de plantillas con variables.

### Fase 4 — Agente IA (núcleo) ⭐
- `LLMProvider` + `AnthropicProvider` (SDK `@anthropic-ai/sdk`, `claude-opus-4-8`, streaming).
- System prompt base y prompt de clasificación; prompt caching del prefijo estable.
- Bucle agéntico manual con `tool_use` y persistencia de `AiRun` / `AiToolCall` / `AiMessage`.
- Tools iniciales: `search_contact`, `update_contact`, `search_knowledge`, `schedule_followup`, `handoff_to_human`.
- Guardrails: ventana 24h, pausa humana, refusal, presupuesto.
- Modo **copilot** primero: la IA **sugiere** respuesta y acciones; el humano aprueba/edita/envía desde la bandeja (`AiSuggestion`, `ToolCallTrace`).
- Memoria de conversación (resumen incremental) para mantener contexto sin reenviar todo el historial.

### Fase 5 — RAG y autopilot
- Base de conocimiento: ingesta de documentos, chunking, embeddings con pgvector; tool `search_knowledge`.
- `KnowledgeBaseManager` en el frontend (subir/editar/eliminar documentos).
- Modo **autopilot** con límites: respuesta autónoma + ejecución de tools de bajo riesgo (`create_deal`, `move_deal_stage` quedan tras aprobación según política).
- Escalado automático por confianza/sentimiento; `HandoffBanner` y reasignación a humano.
- Auto-respuestas por palabra clave y fuera de horario integradas al agente.

### Fase 6 — Campañas, métricas y producción
- Campañas masivas: audiencia por etiquetas, programación, envío por lotes; opt-out automático.
- Dashboard: conversaciones/día, tiempo primera respuesta, tasas de entrega/lectura, rendimiento por agente, **y métricas de IA** (% resueltas por IA sin escalar, tasa de escalado, tokens/costo por conversación, latencia, herramientas más usadas).
- Tests (Jest): ventana 24h, idempotencia, opt-out, integración del webhook, **y suite de IA** (guardrails, parseo de tool_use, decisión de escalado, manejo de `refusal`, presupuesto). Mockear `LLMProvider` para tests deterministas.
- Docker Compose (incluye pgvector), variables de entorno, despliegue.

### Fase 7 — App móvil (Expo) [futuro]
- `apps/mobile` con Expo + Expo Router; reutiliza `packages/shared` (Zod + tipos) y el cliente tipado generado desde OpenAPI.
- Auth contra los mismos `/auth/*` (access + refresh rotativo); almacenamiento seguro del refresh token (SecureStore/Keychain).
- Bandeja y chat en tiempo real (Socket.io con handshake por JWT); push (FCM/APNs) vía modelo `Device`.
- EAS Build/Submit + EAS Update (OTA) para hotfixes sin pasar por las stores.

## Convenciones

- Conventional Commits (`feat:`, `fix:`).
- Variables de entorno para toda configuración (12-Factor); nunca hardcodear tokens. `ANTHROPIC_API_KEY` solo en el backend/worker, jamás en el frontend.
- DTOs con class-validator en cada endpoint.
- Swagger autogenerado.
- **IA:** toda llamada al LLM pasa por `LLMProvider`; toda ejecución de tool pasa por `guardrails.service`; toda interacción de IA se persiste (`AiRun`/`AiToolCall`) para auditoría. Prompts versionados en `prompt/`. Modelo y `effort` configurables por `AgentConfig`, no hardcodeados.
