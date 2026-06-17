import { auth } from "@/auth";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Cliente de API server-side (BFF): se ejecuta en el servidor de Next,
 * lee el access token de la sesión (cookie httpOnly) y lo adjunta como
 * Bearer al llamar a NestJS. El navegador nunca maneja el JWT.
 *
 * Usar SOLO desde Server Components, route handlers o server actions.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await auth();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Igual que apiFetch pero devuelve la Response cruda, para que los route
 * handlers (BFF) propaguen el status y el cuerpo del backend tal cual
 * (p. ej. un 400 "fuera de ventana 24h").
 */
export async function apiForward(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = await auth();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  return fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
}

/** Reenvía una Response del backend conservando status y JSON. */
export async function relay(res: Response): Promise<Response> {
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
