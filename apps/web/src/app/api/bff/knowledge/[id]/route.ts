import { apiForward, relay } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return relay(await apiForward(`/knowledge/${id}`, { method: "DELETE" }));
}
