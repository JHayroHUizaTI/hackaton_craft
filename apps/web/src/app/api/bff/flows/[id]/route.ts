import { apiForward, relay } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return relay(await apiForward(`/flows/${id}`));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.text();
  return relay(await apiForward(`/flows/${id}`, { method: "PATCH", body }));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return relay(await apiForward(`/flows/${id}`, { method: "DELETE" }));
}
