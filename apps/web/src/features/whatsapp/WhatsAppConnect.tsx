"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WhatsappChannel } from "@crm/shared";
import {
  connectWhatsapp,
  disconnectWhatsapp,
  fetchWhatsappChannels,
} from "@/lib/bff";

const APP_ID = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID ?? "";
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID ?? "";
const GRAPH_VERSION = "v21.0";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppConnect() {
  const queryClient = useQueryClient();
  const [sdkReady, setSdkReady] = useState(false);
  const signupRef = useRef<{ phoneNumberId?: string; wabaId?: string }>({});

  const { data: channels, isPending } = useQuery({
    queryKey: ["wa-channels"],
    queryFn: fetchWhatsappChannels,
  });

  const connect = useMutation({
    mutationFn: connectWhatsapp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-channels"] }),
  });
  const disconnect = useMutation({
    mutationFn: disconnectWhatsapp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-channels"] }),
  });

  // Cargar el SDK de Facebook (Embedded Signup).
  useEffect(() => {
    if (!APP_ID) return;
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: GRAPH_VERSION,
      });
      setSdkReady(true);
    };
    if (document.getElementById("fb-sdk")) {
      if (window.FB) setSdkReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "fb-sdk";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.src = "https://connect.facebook.net/es_LA/sdk.js";
    document.body.appendChild(s);
  }, []);

  // El Embedded Signup envía por postMessage el waba_id / phone_number_id.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!String(event.origin).includes("facebook.com")) return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.data) {
          signupRef.current = {
            phoneNumberId: data.data.phone_number_id,
            wabaId: data.data.waba_id,
          };
        }
      } catch {
        /* ignorar mensajes ajenos */
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function launch() {
    if (!window.FB || !CONFIG_ID) return;
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        const { phoneNumberId, wabaId } = signupRef.current;
        if (code && phoneNumberId) {
          connect.mutate({ code, phoneNumberId, wabaId, mode: "coexistence" });
        }
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  }

  const missingConfig = !APP_ID || !CONFIG_ID;
  const list = channels ?? [];
  const connectError = connect.isError ? (connect.error as Error).message : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Números de WhatsApp</h2>
        {!missingConfig && list.length > 0 && (
          <button onClick={launch} disabled={!sdkReady || connect.isPending} style={addBtn}>
            <WaIcon />
            {connect.isPending ? "Conectando…" : "Añadir número"}
          </button>
        )}
      </div>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>
        Conecta uno o varios números con <strong>Coexistencia</strong>: sigues
        usando la app de WhatsApp Business en cada celular y gestionas todo desde
        el CRM. Cada conversación se responde por el número por el que entró.
      </p>

      {connectError && (
        <p style={{ color: "#ff6b6b", fontSize: 13 }}>{connectError}</p>
      )}

      <div style={card}>
        {isPending ? (
          <p style={{ color: "var(--muted)" }}>Verificando estado…</p>
        ) : missingConfig ? (
          <PendingConfig hasAppId={!!APP_ID} />
        ) : list.length === 0 ? (
          <Empty
            ready={sdkReady}
            connecting={connect.isPending}
            onConnect={launch}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                onDisconnect={() => disconnect.mutate(ch.phoneNumberId)}
                disconnecting={
                  disconnect.isPending &&
                  disconnect.variables === ch.phoneNumberId
                }
              />
            ))}
          </div>
        )}
      </div>

      {!missingConfig && list.length > 0 && (
        <>
          <div style={syncNote}>
            <strong style={{ color: "var(--text)" }}>
              Sincronización bidireccional activa
            </strong>
            <p style={{ margin: "6px 0 0" }}>
              Los mensajes que escribas desde la app de WhatsApp en el celular
              también aparecen en el CRM, y la IA se pausa automáticamente cuando
              respondes tú. Para que funcione, en Meta → WhatsApp → Configuración →
              Webhooks, suscribe los campos <code>messages</code> y{" "}
              <code>message_echoes</code>.
            </p>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 14 }}>
            Al conectar aceptas nuestra{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#25d366" }}>
              Política de Privacidad
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}

const syncNote: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #1f6f46",
  background: "rgba(37,211,102,0.07)",
  color: "var(--muted)",
  fontSize: 13,
  lineHeight: 1.6,
};

function ChannelRow({
  channel,
  onDisconnect,
  disconnecting,
}: {
  channel: WhatsappChannel;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const online = channel.isActive && channel.status === "connected";
  return (
    <div style={row}>
      <span style={dot(online ? "#25d366" : "#7a8aa0")} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 15 }}>
            {channel.label ||
              channel.displayPhoneNumber ||
              channel.phoneNumberId}
          </strong>
          <span style={pill(channel.source === "env" ? "#43506a" : "#1f6f46")}>
            {channel.mode === "coexistence" ? "Coexistencia" : "API"}
            {channel.source === "env" ? " · .env" : ""}
          </span>
          {!online && <span style={pill("#5a4a2a")}>Inactivo</span>}
        </div>
        {(channel.displayPhoneNumber || channel.label) && (
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
            {channel.displayPhoneNumber ?? channel.phoneNumberId}
          </div>
        )}
      </div>
      {channel.source !== "env" && online && (
        <button onClick={onDisconnect} disabled={disconnecting} style={ghostBtn}>
          {disconnecting ? "…" : "Desconectar"}
        </button>
      )}
    </div>
  );
}

function Empty({
  ready,
  connecting,
  onConnect,
}: {
  ready: boolean;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={dot("#7a8aa0")} />
        <strong style={{ fontSize: 16 }}>Sin números conectados</strong>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
        Pulsa el botón y se abrirá la ventana oficial de Meta. Elige tu cuenta y
        número, y <strong>escanea el QR con tu WhatsApp Business</strong> para
        activar la Coexistencia. Repite el proceso por cada número que quieras
        añadir.
      </p>
      <div>
        <button onClick={onConnect} disabled={!ready || connecting} style={waBtn}>
          <WaIcon />
          {connecting ? "Conectando…" : ready ? "Conectar WhatsApp" : "Cargando…"}
        </button>
      </div>
    </div>
  );
}

function PendingConfig({ hasAppId }: { hasAppId: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={dot("#e0a458")} />
        <strong style={{ fontSize: 16 }}>Configuración pendiente</strong>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
        Falta un dato de Meta para habilitar el botón de conexión:
      </p>
      <ol style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginTop: 0 }}>
        {!hasAppId && (
          <li>
            <code>NEXT_PUBLIC_WHATSAPP_APP_ID</code> en{" "}
            <code>apps/web/.env.local</code>.
          </li>
        )}
        <li>
          En tu App de Meta → <strong>Facebook Login for Business</strong> →
          <strong> Configurations</strong> → crea una configuración de Embedded
          Signup y copia su <strong>Config ID</strong>.
        </li>
        <li>
          Pégalo en <code>NEXT_PUBLIC_WHATSAPP_CONFIG_ID</code> (en{" "}
          <code>apps/web/.env.local</code>) y reinicia <code>npm run dev</code>.
        </li>
      </ol>
    </div>
  );
}

function WaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.5-1.2-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .2 0 .8-.2 1.6Z" />
    </svg>
  );
}

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 22,
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
};

const waBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#25d366",
  color: "#04210f",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 9,
  border: "none",
  background: "#25d366",
  color: "#04210f",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 8,
  border: "1px solid #5a2a2a",
  background: "transparent",
  color: "#e08a8a",
  cursor: "pointer",
  fontSize: 13,
  whiteSpace: "nowrap",
};

function dot(color: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  };
}

function pill(bg: string): React.CSSProperties {
  return {
    fontSize: 11,
    padding: "2px 9px",
    borderRadius: 999,
    background: bg,
    color: "#e9f1ff",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };
}
