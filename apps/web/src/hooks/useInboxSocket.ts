"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "./useRealtime";

/** Refresca bandeja y chat en tiempo real ante cada `inbox.changed`. */
export function useInboxSocket(): { connected: boolean } {
  const queryClient = useQueryClient();
  return useRealtime({
    "inbox.changed": (payload) => {
      const { conversationId } = payload as { conversationId: string };
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}
