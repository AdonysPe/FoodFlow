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

export function IconLock({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </svg>
  );
}

export function IconEye({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M2.8 12s3.2-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function IconEyeOff({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4l16 16" />
      <path d="M9.9 6.8A10.8 10.8 0 0 1 12 6.5c6 0 9.2 5.5 9.2 5.5a14.5 14.5 0 0 1-2.3 3" />
      <path d="M14.2 14.2a3.1 3.1 0 0 1-4.4-4.4M6.7 8.1A15.1 15.1 0 0 0 2.8 12s3.2 5.5 9.2 5.5a10.8 10.8 0 0 0 2.1-.2" />
    </svg>
  );
}

export function IconBuilding({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 20.5V5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15" />
      <path d="M16.5 9h2a1 1 0 0 1 1 1v10.5M2.5 20.5h19M8 7.5h5M8 11.5h5M8 15.5h2M12.5 20.5v-4h2" />
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

export function IconStaff({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="7.5" r="3" />
      <path d="M6.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M9 4.5 12 6l3-1.5" />
    </svg>
  );
}

export function IconReceipt({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17Z" />
      <path d="M9 8h6M9 11.5h6M9 15h3" />
    </svg>
  );
}

export function IconSearch({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

export function IconGrip({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}

/**
 * WhatsApp. The bubble keeps the family stroke; the handset is filled,
 * because at 20px an outlined handset turns into a smudge and this mark has
 * to be recognised instantly to be worth putting in the corner.
 */
export function IconWhatsApp({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.7 20.3l1.25-3.95a8.4 8.4 0 1 1 3.1 3.02L3.7 20.3Z" />
      <path
        d="M9.62 8.2c-.16-.37-.33-.38-.54-.38h-.46c-.16 0-.42.06-.63.3-.22.25-.83.81-.83 1.97 0 1.16.85 2.28.97 2.44.12.16 1.65 2.64 4.08 3.6 2.02.8 2.43.64 2.87.6.44-.04 1.4-.58 1.6-1.13.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28-.24-.12-1.4-.7-1.62-.78-.22-.08-.38-.12-.53.12-.16.24-.6.77-.74.93-.14.16-.27.18-.51.06-.24-.12-1.01-.37-1.92-1.19-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.29-.74-1.76Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Instagram, in the family stroke: rounded frame, lens, flash dot. */
export function IconInstagram({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" strokeWidth="2.2" />
    </svg>
  );
}

/**
 * TikTok. The note is one continuous stroke, so it stays recognisable at the
 * 16–20px it is used at without needing the filled brand artwork.
 */
export function IconTikTok({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M14 3.5v11.2a3.7 3.7 0 1 1-3.7-3.7" />
      <path d="M14 3.5c.3 2.4 1.9 4.2 4.5 4.4" />
    </svg>
  );
}

/**
 * Complaints book. Drawn in the family stroke rather than shipped as
 * INDECOPI's official artwork, which is their trademark and has to come from
 * them — drop it in /public and swap this out if you want the exact asset.
 * What the law actually requires is that the link be visible and say what it
 * is, and the label next to this icon does that.
 */
export function IconClaimsBook({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 5.2A1.7 1.7 0 0 1 6.2 3.5H19a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H6.2a1.7 1.7 0 0 0-1.7 1.7Z" />
      <path d="M4.5 5.2v15" />
      <path d="M8.6 8h7M8.6 11.4h4.6" />
    </svg>
  );
}

export function IconSun({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

export function IconMoon({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />
    </svg>
  );
}

export function IconPrinter({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path d="M7 9V3.5h10V9" />
      <path d="M5 9h14a2 2 0 0 1 2 2v5h-4v4.5H7V16H3v-5a2 2 0 0 1 2-2Z" />
      <path d="M17.5 12.5h.01" />
    </svg>
  );
}

export function IconGlobe({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9.5h17M3.5 14.5h17" />
      <path d="M12 3c-2.2 2.4-3.3 5.4-3.3 9s1.1 6.6 3.3 9c2.2-2.4 3.3-5.4 3.3-9S14.2 5.4 12 3Z" />
    </svg>
  );
}
