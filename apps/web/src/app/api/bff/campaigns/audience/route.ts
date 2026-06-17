import { apiForward, relay } from "@/lib/api";

export async function GET(req: Request) {
  const tagIds = new URL(req.url).searchParams.get("tagIds") ?? "";
  return relay(
    await apiForward(`/campaigns/audience?tagIds=${encodeURIComponent(tagIds)}`),
  );
}
