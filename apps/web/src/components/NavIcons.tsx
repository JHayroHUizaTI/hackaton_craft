// Familia de iconos de línea unificada (estilo lucide: trazo 1.75, 24×24,
// esquinas/uniones redondeadas). Se usa en el nav lateral y en los flujos
// para mantener una sola línea gráfica en toda la app.

export type IconName =
  // Navegación
  | "inbox"
  | "pipeline"
  | "bot"
  | "flow"
  | "megaphone"
  | "book"
  | "whatsapp"
  | "logout"
  // Bloques de flujo
  | "message"
  | "question"
  | "branch"
  | "bolt"
  | "clock"
  | "globe"
  | "user"
  | "jump"
  | "play"
  | "tag";

export function NavIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "inbox":
      return (
        <svg {...p}>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
        </svg>
      );
    case "pipeline":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="5" height="16" rx="1.5" />
          <rect x="9.5" y="4" width="5" height="10" rx="1.5" />
          <rect x="16" y="4" width="5" height="13" rx="1.5" />
        </svg>
      );
    case "bot":
      return (
        <svg {...p}>
          <rect x="4" y="8" width="16" height="11" rx="3" />
          <path d="M12 8V5" />
          <circle cx="12" cy="3.6" r="1.1" />
          <path d="M2 14h1.5M20.5 14H22M9 13v1.5M15 13v1.5" />
        </svg>
      );
    case "flow":
      return (
        <svg {...p}>
          <rect x="3.5" y="3.5" width="6" height="5" rx="1.5" />
          <rect x="14.5" y="15.5" width="6" height="5" rx="1.5" />
          <path d="M6.5 8.5v4a2 2 0 0 0 2 2h9" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...p}>
          <path d="m3 11 16-5v12L3 14z" />
          <path d="M6 14v3a2 2 0 0 0 4 0" />
          <path d="M19 9a3 3 0 0 1 0 6" />
        </svg>
      );
    case "book":
      return (
        <svg {...p}>
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...p}>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5z" />
          <path d="M9.3 9.2c-.2 0-.4.1-.6.3-.3.3-.6.7-.6 1.4 0 .8.6 1.6.7 1.7.1.2 1.1 1.9 2.8 2.6 1.4.6 1.7.5 2 .4.3 0 .9-.4 1-.7.2-.4.2-.7.1-.8l-.6-.3c-.3-.1-.6-.3-.8-.3-.2 0-.3-.1-.5.1l-.4.5c-.1.1-.2.1-.4 0-.2-.1-.7-.3-1.3-.8-.5-.4-.8-1-.9-1.1-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4 0-.1 0-.3 0-.4l-.5-1.1c-.1-.3-.2-.3-.4-.3z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...p}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
      );
    case "message":
      return (
        <svg {...p}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "question":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9.2a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "branch":
      return (
        <svg {...p}>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...p}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "globe":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
        </svg>
      );
    case "user":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "jump":
      return (
        <svg {...p}>
          <path d="M4 5v6a3 3 0 0 0 3 3h12" />
          <path d="m15 10 5 4-5 4" />
        </svg>
      );
    case "play":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M10 8.5 16 12l-6 3.5z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z" />
          <circle cx="7.5" cy="7.5" r="1.3" />
        </svg>
      );
  }
}
