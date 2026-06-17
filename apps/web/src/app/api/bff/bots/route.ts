import { apiForward, relay } from "@/lib/api";

export async function GET() {
  return relay(await apiForward("/bots"));
}

export async function POST(req: Request) {
  const body = await req.text();
  return relay(await apiForward("/bots", { method: "POST", body }));
}
