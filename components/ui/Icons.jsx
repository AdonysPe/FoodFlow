/**
 * Hand-drawn 24px line icons on a consistent 1.5 stroke, so the set reads as
 * one family. No icon dependency to install or version.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function IconOrders({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1v15.2a.6.6 0 0 1-.9.5L16 19l-2 1.2-2-1.2-2 1.2-2-1.2-2.1 1.2a.6.6 0 0 1-.9-.5V4.5a1 1 0 0 1 1-1Z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3" />
    </svg>
  );
}

export function IconDashboard({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 12a8.5 8.5 0 0 1 17 0" />
      <path d="M3.5 12v3.5M20.5 12v3.5" />
      <path d="m12 12 4-3.5" />
      <circle cx="12" cy="12" r="1.4" />
      <path d="M6.5 8.7l.9.9M17.5 8.7l-.9.9M12 5.5v1.3" />
    </svg>
  );
}

export function IconInsights({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c0-2.8 2.5-4.8 5.5-4.8s5.5 2 5.5 4.8" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.4" />
      <path d="M18.2 14.9c1.6.8 2.8 2.3 2.8 4.6" />
    </svg>
  );
}

export function IconAnalytics({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 20.5h17" />
      <path d="M6.5 17V11M11 17V6.5M15.5 17v-4M20 17V8.5" />
    </svg>
  );
}

export function IconBolt({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M13.5 2.5 5 13.2h5.6L10 21.5 19 10.6h-5.7l.2-8.1Z" />
    </svg>
  );
}

export function IconClock({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function IconTarget({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconTrendUp({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 16.5 9 11l3.5 3.5 8-8" />
      <path d="M15.5 6.5h5v5" />
    </svg>
  );
}

export function IconCheck({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className} strokeWidth={2}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function IconArrowRight({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className} strokeWidth={1.8}>
      <path d="M4.5 12h14" />
      <path d="m13 6.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function IconPlay({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.3 9.2v5.6l4.5-2.8-4.5-2.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconShield({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 5 5.8v5.4c0 4.2 2.9 7.7 7 9.3 4.1-1.6 7-5.1 7-9.3V5.8L12 3Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </svg>
  );
}

export function IconMail({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

export function IconMenuBook({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6c-2.1-1.1-4.6-1.4-7.2-1.1v13c2.6-.3 5.1 0 7.2 1.1 2.1-1.1 4.6-1.4 7.2-1.1v-13C16.6 4.6 14.1 4.9 12 6Z" />
      <path d="M12 6v13" />
    </svg>
  );
}

export function IconCart({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h2l1.9 9.4a2 2 0 0 0 2 1.6h6.4a2 2 0 0 0 2-1.6L20 8H7.2" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="16.5" cy="19" r="1.3" />
    </svg>
  );
}

export function IconChat({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12.3a8 8 0 1 1 3.4 6.5L4 19.8l1.2-3.2A7.9 7.9 0 0 1 4 12.3Z" />
      <path d="M8.5 11.3h7M8.5 14.3h4.5" />
    </svg>
  );
}

export function IconUsers({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-2.9 2.5-5 5.5-5s5.5 2.1 5.5 5" />
      <path d="M16 8.2a2.6 2.6 0 0 1 0 4.9" />
      <path d="M17.5 14.3c1.9.5 3 1.9 3 4.2" />
    </svg>
  );
}

export function IconStore({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9.5 5.2 4h13.6l1.2 5.5" />
      <path d="M4 9.5a2.3 2.3 0 0 0 4.5.7 2.3 2.3 0 0 0 4.5 0 2.3 2.3 0 0 0 4.5 0 2.3 2.3 0 0 0 4.5-.7" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5V15h4v4.5" />
    </svg>
  );
}

export function IconKitchen({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 11.5h15l-1.1 8a1.5 1.5 0 0 1-1.5 1.3H7.1a1.5 1.5 0 0 1-1.5-1.3l-1.1-8Z" />
      <path d="M3.5 11.5a8.5 8.5 0 0 1 17 0" />
      <path d="M9 6.2c-.9-1-.9-2 0-3M12.5 6.2c-.9-1-.9-2 0-3" />
    </svg>
  );
}

export function IconTables({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3.3v3M12 17.7v3M3.3 12h3M17.7 12h3" />
    </svg>
  );
}

export function IconLogout({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M20 12H10.5M20 12l-3.5-3.5M20 12l-3.5 3.5" />
    </svg>
  );
}

export function IconMenu({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconX({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className} strokeWidth={1.8}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}
