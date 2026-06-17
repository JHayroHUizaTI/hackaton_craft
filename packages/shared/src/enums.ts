// Enums de dominio compartidos entre backend y clientes.
// Se mantienen en sincronía con los enums de Prisma.

export const Role = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Platform = {
  WEB: "WEB",
  IOS: "IOS",
  ANDROID: "ANDROID",
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

export const ConversationStatus = {
  OPEN: "OPEN",
  PENDING: "PENDING",
  CLOSED: "CLOSED",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const AiMode = {
  AUTOPILOT: "AUTOPILOT",
  COPILOT: "COPILOT",
  OFF: "OFF",
} as const;
export type AiMode = (typeof AiMode)[keyof typeof AiMode];

export const MessageDirection = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;
export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  DOCUMENT: "DOCUMENT",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  STICKER: "STICKER",
  LOCATION: "LOCATION",
  TEMPLATE: "TEMPLATE",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageStatus = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const MessageAuthor = {
  CONTACT: "CONTACT",
  HUMAN: "HUMAN",
  AI: "AI",
} as const;
export type MessageAuthor = (typeof MessageAuthor)[keyof typeof MessageAuthor];
