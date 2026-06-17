import { MessageStatus, MessageType } from "@crm/shared";

// ── Payloads de los jobs de la cola inbound ──────────────────
export interface InboundMessageJob {
  kind: "message";
  from: string;
  name?: string;
  waMessageId: string;
  type: MessageType;
  text?: string;
  mediaId?: string;
  // phone_number_id del número que recibió el mensaje (multi-número).
  channelPhoneNumberId?: string;
}

export interface InboundStatusJob {
  kind: "status";
  waMessageId: string;
  status: MessageStatus;
}

export type InboundJob = InboundMessageJob | InboundStatusJob;

// ── Forma (parcial) del webhook de Meta ──────────────────────
interface MetaContact {
  profile?: { name?: string };
  wa_id: string;
}
interface MetaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  document?: { id: string; caption?: string };
}
interface MetaStatus {
  id: string;
  status: string;
}
interface MetaValue {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}
export interface MetaWebhookBody {
  entry?: { changes?: { value?: MetaValue }[] }[];
}

const TYPE_MAP: Record<string, MessageType> = {
  text: MessageType.TEXT,
  image: MessageType.IMAGE,
  document: MessageType.DOCUMENT,
  audio: MessageType.AUDIO,
  video: MessageType.VIDEO,
  sticker: MessageType.STICKER,
  location: MessageType.LOCATION,
};

const STATUS_MAP: Record<string, MessageStatus> = {
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  failed: MessageStatus.FAILED,
};

/** Convierte un webhook de Meta en una lista plana de jobs para la cola. */
export function normalizeWebhook(body: MetaWebhookBody): InboundJob[] {
  const jobs: InboundJob[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const channelPhoneNumberId = value.metadata?.phone_number_id;

      const nameByWaId = new Map<string, string | undefined>();
      for (const c of value.contacts ?? []) {
        nameByWaId.set(c.wa_id, c.profile?.name);
      }

      for (const m of value.messages ?? []) {
        const type = TYPE_MAP[m.type] ?? MessageType.TEXT;
        jobs.push({
          kind: "message",
          from: m.from,
          name: nameByWaId.get(m.from),
          waMessageId: m.id,
          type,
          text: m.text?.body,
          mediaId: m.image?.id ?? m.document?.id,
          channelPhoneNumberId,
        });
      }

      for (const s of value.statuses ?? []) {
        const status = STATUS_MAP[s.status];
        if (status) jobs.push({ kind: "status", waMessageId: s.id, status });
      }
    }
  }
  return jobs;
}
