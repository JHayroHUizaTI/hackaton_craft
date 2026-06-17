import { apiForward, relay } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.text();
  return relay(
    await apiForward(`/sellers/${id}/sources`, { method: "PATCH", body }),
  );
}
