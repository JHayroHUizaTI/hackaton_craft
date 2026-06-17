import { apiForward, relay } from "@/lib/api";

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.get("search") ?? "";
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return relay(await apiForward(`/products${qs}`));
}

export async function POST(req: Request) {
  const body = await req.text();
  return relay(await apiForward("/products", { method: "POST", body }));
}
