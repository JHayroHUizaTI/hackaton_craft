"use client";

import { useEffect, useState } from "react";
import { dismissToast, subscribeToasts, type ToastItem } from "@/lib/toast";

const ICON: Record<ToastItem["kind"], string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.kind}`}
          onClick={() => dismissToast(t.id)}
          role="alert"
        >
          <span className={`toast-icon toast-icon-${t.kind}`}>{ICON[t.kind]}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
