import { apiForward, relay } from "@/lib/api";

export async function PATCH(req: Request) {
  const body = await req.text();
  return relay(await apiForward("/stages/reorder", { method: "PATCH", body }));
}
