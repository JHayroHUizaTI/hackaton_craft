// Contrato del proveedor de WhatsApp (patrón Adapter).
// La lógica de negocio depende SOLO de esta interfaz, nunca de Meta directamente.

export const WHATSAPP_PROVIDER = Symbol("WHATSAPP_PROVIDER");

export interface SendResult {
  waMessageId: string;
}

export interface DownloadedMedia {
  url: string; // ubicación donde quedó almacenado el medio
  mimeType: string;
}

export interface WhatsAppProvider {
  /** Nombre legible para logs/diagnóstico ("fake" | "meta"). */
  readonly name: string;

  /**
   * Envía texto. `fromPhoneNumberId` selecciona el canal/número emisor
   * (multi-número); si se omite, usa el canal activo por defecto.
   */
  sendText(
    to: string,
    text: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult>;

  sendMedia(
    to: string,
    kind: "IMAGE" | "DOCUMENT",
    mediaUrl: string,
    caption?: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult>;

  /**
   * Envía un mensaje de plantilla (obligatorio fuera de la ventana de 24h).
   * `variables` son los valores posicionales del cuerpo ({{1}}, {{2}}…).
   */
  sendTemplate(
    to: string,
    templateName: string,
    language: string,
    variables: string[],
    fromPhoneNumberId?: string,
  ): Promise<SendResult>;

  /**
   * Reacciona a un mensaje con un emoji (cadena vacía = quita la reacción).
   */
  sendReaction(
    to: string,
    targetWaMessageId: string,
    emoji: string,
    fromPhoneNumberId?: string,
  ): Promise<SendResult>;

  /** Descarga un medio entrante (por su id de Meta) al almacenamiento. */
  downloadMedia(mediaId: string, fromPhoneNumberId?: string): Promise<DownloadedMedia>;
}
