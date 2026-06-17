import { apiForward, relay } from "@/lib/api";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const qs = sp.toString();
  return relay(await apiForward(`/conversations${qs ? `?${qs}` : ""}`));
}
