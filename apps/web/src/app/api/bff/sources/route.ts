import { apiForward, relay } from "@/lib/api";

export async function GET() {
  return relay(await apiForward("/sources"));
}

export async function POST(req: Request) {
  const body = await req.text();
  return relay(await apiForward("/sources", { method: "POST", body }));
}
