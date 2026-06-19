// Diálogo de confirmación con estilo (reemplaza window.confirm).
// `confirmDialog(...)` devuelve una promesa<boolean>; <ConfirmHost/> renderiza
// la UI y la resuelve. Funciona desde cualquier sitio, como window.confirm.

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface PendingConfirm extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

type Listener = (current: PendingConfirm | null) => void;

let current: PendingConfirm | null = null;
const listeners = new Set<Listener>();
let seq = 0;

function emit(): void {
  for (const l of listeners) l(current);
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    current = { ...options, id: ++seq, resolve };
    emit();
  });
}

export function resolveConfirm(value: boolean): void {
  if (current) {
    current.resolve(value);
    current = null;
    emit();
  }
}
