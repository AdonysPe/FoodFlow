import { Playfair_Display, Lora, Fraunces, DM_Sans, Cormorant_Garamond, DM_Serif_Display } from "next/font/google";
import { lbFontClasses } from "@/components/landing/lbFonts";
import { resolveMenuTemplate } from "@/lib/menuTemplates";

/**
 * How each carta template looks on paper and on the phone: type, ink, frame
 * and ornaments. `lib/menuTemplates` keeps the identity (name, palette the
 * admin picks from); this file turns it into CSS custom properties, shared by
 * the public carta (PhysicalCartaView) and the table / ordering carta
 * (TableOrderExperience), so both read as the same restaurant.
 *
 * Every family is declared with `preload: false`: a carta only uses the two of
 * its template, and the browser downloads a face only when text uses it.
 */
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"], variable: "--font-carta-playfair", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-carta-lora", display: "swap", preload: false });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-carta-fraunces", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-carta-dmsans", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-carta-cormorant", display: "swap", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-carta-dmserif", display: "swap", preload: false });

export const cartaFontClasses = [playfair, lora, fraunces, dmSans, cormorant, dmSerif].map((font) => font.variable).join(" ") + ` ${lbFontClasses}`;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const MOTIFS = {
  criolla: ["M27 20c8-7 19-3 20 6 1 11-15 18-37 19 10-8 14-18 17-25Z", "M30 18c0-8 6-13 14-12M33 19c5-4 10-5 16-3-3 4-7 6-12 6", "M49 25c17-5 32-1 47 10M64 26c5-10 13-11 19-8-3 6-9 9-17 9M75 29c7-1 13 2 19 6"],
  cevicheria: ["M4 28c13-8 25-8 38 0s25 8 38 0c8-5 16-5 24-1M4 40c13-8 25-8 38 0s25 8 38 0c8-5 16-5 24-1", "M43 12c8-8 22-8 30 0-8 8-22 8-30 0ZM43 12l-9-5v10l9-5Z"],
  chifa: ["M5 5h35v35H5zM13 13h19v19H13zM68 5h35v35H68zM76 13h19v19H76zM40 22h28M23 40v8M85 40v8"],
  pizzeria: ["M54 49V3M54 14C43 12 38 8 37 1c10 1 16 5 17 13Zm0 10c11-2 16-6 17-13-10 1-16 5-17 13Zm0 10c-11-2-16-6-17-13 10 1 16 5 17 13Zm0 10c11-2 16-6 17-13-10 1-16 5-17 13Z", "M6 47c12-7 24-7 36 0M66 47c12-7 24-7 36 0"],
  noche: ["M8 26h30M70 26h30", "M54 14l12 12-12 12-12-12z"],
};

const CORNERS = {
  criolla: "M2 32V14C2 7 7 2 14 2h18M8 32V18c0-6 4-10 10-10h14M14 14h.5",
  chifa: "M2 2h30v30M2 2v30h30M9 9h16v16H9zM2 17h7M17 2v7M25 17h7M17 25v7",
  pizzeria: "M4 30C10 22 18 14 30 4M12 24c-4-1-6-4-6-8 4 1 6 4 6 8Zm6-6c-4-1-6-4-6-8 4 1 6 4 6 8Zm6-6c-4-1-6-4-6-8 4 1 6 4 6 8Z",
};

const THEMES = {
  criolla: {
    eyebrow: "Carta",
    vars: {
      "--c-surround": "#e7dcc8", "--c-paper": "#F5EDDF", "--c-ink": "#2f221c", "--c-muted": "#735d4d",
      "--c-primary": "#742E27", "--c-secondary": "#A04C35", "--c-accent": "#526A43", "--c-rule": "#cdb294", "--c-leader": "#b39a83",
      "--c-price": "#742E27", "--c-cta": "#742E27", "--c-on-cta": "#F5EDDF", "--c-on-primary": "#F5EDDF",
      "--c-display": `var(--font-carta-playfair), ${SERIF}`, "--c-body": `var(--font-carta-lora), ${SERIF}`,
      "--c-name-style": "italic", "--c-name-weight": "700", "--c-name-case": "none", "--c-name-track": "-0.01em",
      "--c-sec-style": "italic", "--c-sec-case": "none", "--c-sec-track": "0", "--c-desc-style": "italic",
      "--c-photo-radius": "50% / 46%", "--c-thumb-radius": "50%", "--c-chip-radius": "999px", "--c-btn-radius": "14px",
      "--c-frame-1": "2px solid #742E27", "--c-frame-2": "1px solid #A04C35", "--c-frame-gap": "2.2mm", "--c-frame-radius": "2px",
      "--c-band": "none", "--c-band-size": "auto", "--c-band-h": "0px",
      "--c-grain": "radial-gradient(ellipse at 10% 8%, rgb(169 102 53 / .11), transparent 32%), radial-gradient(ellipse at 92% 94%, rgb(119 89 52 / .1), transparent 30%)",
    },
  },
  cevicheria: {
    eyebrow: "Cevichería",
    vars: {
      "--c-surround": "#e5ecea", "--c-paper": "#FFF9ED", "--c-ink": "#10303c", "--c-muted": "#4a6670",
      "--c-primary": "#123B4A", "--c-secondary": "#168AAD", "--c-accent": "#52B8B0", "--c-rule": "#b5dadc", "--c-leader": "#8fbfc6",
      "--c-price": "#127596", "--c-cta": "#123B4A", "--c-on-cta": "#FFF9ED", "--c-on-primary": "#FFF9ED",
      "--c-display": `var(--font-carta-fraunces), ${SERIF}`, "--c-body": `var(--font-carta-dmsans), ${SANS}`,
      "--c-name-style": "normal", "--c-name-weight": "700", "--c-name-case": "none", "--c-name-track": "-0.03em",
      "--c-sec-style": "normal", "--c-sec-case": "none", "--c-sec-track": "0", "--c-desc-style": "normal",
      "--c-photo-radius": "18px", "--c-thumb-radius": "16px", "--c-chip-radius": "999px", "--c-btn-radius": "16px",
      "--c-frame-1": "1.5px solid #168AAD", "--c-frame-2": "0 solid transparent", "--c-frame-gap": "0mm", "--c-frame-radius": "20px",
      "--c-band": "radial-gradient(circle at 12px 0, #168AAD 11px, rgb(22 138 173 / 0) 12px)", "--c-band-size": "24px 16px", "--c-band-h": "16px",
      "--c-grain": "radial-gradient(ellipse at 90% 4%, rgb(82 184 176 / .14), transparent 40%)",
    },
  },
  chifa: {
    eyebrow: "Chifa",
    seal: true,
    vars: {
      "--c-surround": "#eadcc6", "--c-paper": "#FFF7E8", "--c-ink": "#2b1b18", "--c-muted": "#74605a",
      "--c-primary": "#7A1F1F", "--c-secondary": "#B83227", "--c-accent": "#C99A35", "--c-rule": "#dfc085", "--c-leader": "#cfa96a",
      "--c-price": "#A82C22", "--c-cta": "#B83227", "--c-on-cta": "#FFF7E8", "--c-on-primary": "#FFF7E8",
      "--c-display": `var(--font-carta-cormorant), ${SERIF}`, "--c-body": `var(--font-carta-lora), ${SERIF}`,
      "--c-name-style": "normal", "--c-name-weight": "700", "--c-name-case": "uppercase", "--c-name-track": "0.08em",
      "--c-sec-style": "normal", "--c-sec-case": "uppercase", "--c-sec-track": "0.18em", "--c-desc-style": "italic",
      "--c-photo-radius": "4px", "--c-thumb-radius": "4px", "--c-chip-radius": "4px", "--c-btn-radius": "6px",
      "--c-frame-1": "8px solid #7A1F1F", "--c-frame-2": "1.5px solid #C99A35", "--c-frame-gap": "3.6mm", "--c-frame-radius": "0",
      "--c-band": "none", "--c-band-size": "auto", "--c-band-h": "0px",
      "--c-grain": "linear-gradient(135deg, rgb(122 31 31 / .03) 25%, transparent 25%) 0 0 / 26px 26px, linear-gradient(315deg, rgb(122 31 31 / .03) 25%, transparent 25%) 0 0 / 26px 26px",
    },
  },
  pizzeria: {
    eyebrow: "Pizzería",
    vars: {
      "--c-surround": "#eadfcd", "--c-paper": "#F8F1E5", "--c-ink": "#2a1f1a", "--c-muted": "#6a594c",
      "--c-primary": "#8F2D24", "--c-secondary": "#C94C32", "--c-accent": "#3F6B3A", "--c-rule": "#d6bea5", "--c-leader": "#c2a990",
      "--c-price": "#8F2D24", "--c-cta": "#8F2D24", "--c-on-cta": "#F8F1E5", "--c-on-primary": "#F8F1E5",
      "--c-display": `var(--font-carta-dmserif), ${SERIF}`, "--c-body": `var(--font-carta-dmsans), ${SANS}`,
      "--c-name-style": "normal", "--c-name-weight": "400", "--c-name-case": "none", "--c-name-track": "-0.02em",
      "--c-sec-style": "italic", "--c-sec-case": "none", "--c-sec-track": "0", "--c-desc-style": "normal",
      "--c-photo-radius": "12px", "--c-thumb-radius": "12px", "--c-chip-radius": "999px", "--c-btn-radius": "14px",
      "--c-frame-1": "1.5px solid #8F2D24", "--c-frame-2": "0 solid transparent", "--c-frame-gap": "0mm", "--c-frame-radius": "6px",
      "--c-band": "repeating-conic-gradient(#8F2D24 0% 25%, #F8F1E5 0% 50%)", "--c-band-size": "18px 18px", "--c-band-h": "18px",
      "--c-grain": "radial-gradient(ellipse at 50% 30%, rgb(201 76 50 / .05), transparent 60%)",
    },
  },
  noche: {
    eyebrow: "Carta",
    vars: {
      "--c-surround": "#0c0908", "--c-paper": "#f3efe6", "--c-ink": "#1c1a18", "--c-muted": "#5f5a54",
      "--c-primary": "#1c1a18", "--c-secondary": "#ff5a33", "--c-accent": "#ff5a33", "--c-rule": "#d9d3cc", "--c-leader": "#c9c1b5",
      "--c-price": "#b8401f", "--c-cta": "#ff5a33", "--c-on-cta": "#0c0908", "--c-on-primary": "#f3efe6",
      "--c-display": `var(--font-lb-display), ${SANS}`, "--c-body": `var(--font-lb-text), ${SANS}`,
      "--c-name-style": "normal", "--c-name-weight": "650", "--c-name-case": "none", "--c-name-track": "-0.055em",
      "--c-sec-style": "normal", "--c-sec-case": "none", "--c-sec-track": "-0.03em", "--c-desc-style": "normal",
      "--c-photo-radius": "20px", "--c-thumb-radius": "18px", "--c-chip-radius": "999px", "--c-btn-radius": "16px",
      "--c-frame-1": "0 solid transparent", "--c-frame-2": "0 solid transparent", "--c-frame-gap": "0mm", "--c-frame-radius": "6px",
      "--c-band": "none", "--c-band-size": "auto", "--c-band-h": "0px",
      "--c-grain": "none",
    },
  },
};

/** The look of one template: CSS variables for `style`, plus the ornaments JSX draws. */
export function cartaTheme(template) {
  const key = resolveMenuTemplate(template);
  const theme = THEMES[key];
  return { key, eyebrow: theme.eyebrow, seal: Boolean(theme.seal), motif: MOTIFS[key], corner: CORNERS[key] ?? null, style: theme.vars };
}

/**
 * Props for the wrapper of the order-status screens (table "¡Pedido enviado!"
 * and the web order tracking). The layout is design B's for every template;
 * a classic template only swaps ink, paper and type through `lb-st--classic`.
 */
export function statusShellProps(template) {
  const theme = cartaTheme(template);
  if (theme.key === "noche") return { "data-theme": "dark", className: `${lbFontClasses} lb lb-st`, style: { paddingTop: 0 } };
  return { "data-theme": "light", "data-template": theme.key, className: `${cartaFontClasses} lb lb-st lb-st--classic`, style: { ...theme.style, paddingTop: 0 } };
}

export function Motif({ paths, className }) {
  return (
    <svg className={className} viewBox="0 0 108 52" fill="none" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Four corner ornaments, mirrored, for templates that have one. */
export function Corners({ path, className }) {
  if (!path) return null;
  return ["tl", "tr", "bl", "br"].map((at) => (
    <svg key={at} className={className} data-at={at} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d={path} />
    </svg>
  ));
}

/** The red seal a chifa carta carries in its masthead: 菜單, "menu". */
export function Seal({ className }) {
  return (
    <span className={className} aria-hidden="true" lang="zh-Hant">
      <span>菜</span>
      <span>單</span>
    </span>
  );
}
