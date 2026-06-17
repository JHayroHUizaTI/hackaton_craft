"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { fetchRealtimeToken } from "@/lib/bff";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Conecta al gateway de Socket.io con un token de realtime de corta vida y
 * registra los handlers indicados. El JWT principal nunca sale del servidor.
 */
export function useRealtime(
  handlers: Record<string, (payload: unknown) => void>,
): { connected: boolean } {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // Mantener los handlers en un ref para no reconectar en cada render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let active = true;

    (async () => {
      const token = await fetchRealtimeToken();
      if (!active) return;

      const socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
      socketRef.current = socket;
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.onAny((event: string, payload: unknown) => {
        handlersRef.current[event]?.(payload);
      });
    })();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { connected };
}
