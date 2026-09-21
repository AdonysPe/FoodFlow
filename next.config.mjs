/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Enforced CSP. Next.js emits inline bootstrap scripts and the UI uses inline
// styles, so unsafe-inline remains scoped to script/style while every remote
// origin is explicitly allow-listed.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // 'unsafe-inline' is required until we wire per-request nonces into Next's
  // script tags. 'unsafe-eval' only in dev (React Refresh / HMR).
  // maps.googleapis.com/maps.gstatic.com: the delivery address picker, loaded
  // only when a diner picks Delivery (components/public/DeliveryLocationPicker.jsx).
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Map tiles and UI icons are served from several googleapis/gstatic
  // subdomains (khms*, mt*, etc.) — Google's own CSP guidance wildcards them.
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Server Actions POST to same-origin. ws/wss only in dev for HMR.
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://maps.googleapis.com https://*.googleapis.com${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // Enforced immediately — none of these can break a flow this app has.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // geolocation=(self): only this origin may ask, and only on the diner's
    // own click ("Usar mi ubicación" in the delivery picker) — never on load.
    value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
  },
  // Browsers ignore HSTS over plain HTTP / on localhost, so it's safe to always
  // send; it only takes effect on the HTTPS Vercel deploy.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    // A venue pastes its own photo links into the Menú module, so the host is
    // whatever their photographer or CDN uses — there is no list to allow in
    // advance. Next fetches each one once and serves the optimised copy from
    // our own origin, so a diner never touches the third party and the third
    // party never sees the diner. Only https, so a pasted http:// link cannot
    // downgrade the page.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // The carta uses one fixed thumbnail size and one full-bleed size; these
    // keep Next from generating widths nothing on the page ever asks for.
    imageSizes: [86, 172, 256],
    deviceSizes: [360, 640, 828, 1080],
    formats: ["image/webp"],
    // A dish photo changes when the dish does, which is rare.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  experimental: {
    // Server Actions already reject any request whose Origin doesn't match the
    // Host (built-in CSRF protection). This list would ADD trusted origins that
    // may bypass that check — we want none. Kept here, empty, as an explicit
    // statement of intent so nobody loosens it by accident.
    serverActions: {
      allowedOrigins: [],
      // A digital certificate travels through a Server Action as base64, and
      // the default 1 MB cap would reject it. Real .pfx files are a few KB —
      // the action itself refuses anything over 5 MB — so this is headroom for
      // the encoding, not an invitation to upload large files.
      bodySizeLimit: "8mb",
    },
  },

  // The dev SQLite journal (legacy) and Prisma's dev.db were tripping webpack's
  // watcher into needless full rebuilds on every DB hit.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/prisma/dev.db*"],
      };
    }
    return config;
  },
};

export default nextConfig;
