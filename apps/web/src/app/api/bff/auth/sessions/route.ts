import { apiForward, relay } from "@/lib/api";

export async function GET() {
  return relay(await apiForward("/auth/sessions"));
}

// Cierra todas las demás sesiones (deja viva solo la actual).
export async function DELETE() {
  return relay(await apiForward("/auth/sessions", { method: "DELETE" }));
}
