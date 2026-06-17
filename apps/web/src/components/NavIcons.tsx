export type IconName =
  | "inbox"
  | "pipeline"
  | "bot"
  | "flow"
  | "megaphone"
  | "book"
  | "whatsapp"
  | "logout";

const COMMON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function NavIcon({ name }: { name: IconName }) {
  switch (name) {
    case "inbox":
      return (
        <svg {...COMMON}>
          <path d="M3 12h4l2 3h6l2-3h4" />
          <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "pipeline":
      return (
        <svg {...COMMON}>
          <rect x="3" y="4" width="5" height="16" rx="1" />
          <rect x="10" y="4" width="5" height="10" rx="1" />
          <rect x="17" y="4" width="4" height="13" rx="1" />
        </svg>
      );
    case "bot":
      return (
        <svg {...COMMON}>
          <rect x="4" y="8" width="16" height="11" rx="3" />
          <path d="M12 5v3M9 13h.01M15 13h.01M8 19v2M16 19v2" />
        </svg>
      );
    case "flow":
      return (
        <svg {...COMMON}>
          <rect x="3" y="4" width="6" height="5" rx="1" />
          <rect x="15" y="15" width="6" height="5" rx="1" />
          <rect x="9" y="15" width="0.01" height="0.01" />
          <path d="M6 9v4a2 2 0 0 0 2 2h7" />
        </svg>
      );
    case "megaphone":
      return (
        <svg {...COMMON}>
          <path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" />
          <path d="M18 8a4 4 0 0 1 0 8" />
        </svg>
      );
    case "book":
      return (
        <svg {...COMMON}>
          <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
          <path d="M5 4v14a2 2 0 0 0 2 2" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm5 12.4c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .1-1.6-.1l-1.5-.6c-2.6-1.1-4.2-3.7-4.4-3.9-.1-.2-1-1.3-1-2.5s.6-1.7.9-2c.2-.2.4-.3.6-.3h.4c.2 0 .4 0 .5.4l.7 1.7c.1.1.1.3 0 .5l-.3.4-.3.3c-.1.1-.3.3-.1.5.2.3.7 1.1 1.5 1.8 1 .8 1.8 1.1 2.1 1.3.2.1.4.1.5-.1l.6-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.5-.1 1Z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...COMMON}>
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
          <path d="M10 17l-5-5 5-5M4 12h11" />
        </svg>
      );
  }
}
