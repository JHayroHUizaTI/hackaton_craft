import { apiForward, relay } from "@/lib/api";

export async function GET() {
  return relay(await apiForward("/agent-config"));
}

export async function PATCH(req: Request) {
  const body = await req.text();
  return relay(await apiForward("/agent-config", { method: "PATCH", body }));
}
