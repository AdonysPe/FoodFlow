/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Enforced CSP. Next.js emits inline bootstrap scripts and the UI uses inline
// styles, so unsafe-inline remains scoped to script/style while every remote
// origin is explicitly allow-listed.
//
// `culqi` widens it for exactly one page (see `headers()` below): Culqi
// Checkout and Culqi 3-D Secure are scripts and iframes served from Culqi's
// own domains, so the page that opens them has to allow those — and no other
// page in the product does.
function buildCsp({ culqi = false } = {}) {
  const culqiScripts = culqi ? " https://checkout.culqi.com https://3ds.culqi.com" : "";
  // 3-D Secure shows the issuing bank's challenge inside an iframe, and which
  // bank (so which domain) is not known in advance. Framing is therefore
  // opened to https on this one page. It only lets THIS page embed things; it
  // does not let anyone embed FoodFlow (frame-ancestors stays 'none').
  // Tighten to the exact origins once the sandbox shows them in the console.
  const frameSrc = culqi ? "frame-src https:" : "frame-src 'none'";
  const culqiConnect = culqi
    ? " https://api.culqi.com https://secure.culqi.com https://checkout.culqi.com https://3ds.culqi.com"
    : "";
  const culqiImg = culqi ? " https://*.culqi.com" : "";
  const culqiStyle = culqi ? " https://checkout.culqi.com" : "";
  return [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // 'unsafe-inline' is required until we wire per-request nonces into Next's
  // script tags. 'unsafe-eval' only in dev (React Refresh / HMR).
  // maps.googleapis.com/maps.gstatic.com: the delivery address picker, loaded
  // only when a diner picks Delivery (components/public/DeliveryLocationPicker.jsx).
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com${culqiScripts}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${culqiStyle}`,
  // Map tiles and UI icons are served from several googleapis/gstatic
  // subdomains (khms*, mt*, etc.) — Google's own CSP guidance wildcards them.
  `img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com${culqiImg}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  // Server Actions POST to same-origin. ws/wss only in dev for HMR.
  `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://maps.googleapis.com https://*.googleapis.com${culqiConnect}${isDev ? " ws: wss:" : ""}`,
  frameSrc,
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const csp = buildCsp();
const cspWithCulqi = buildCsp({ culqi: true });

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
    return [
      { source: "/:path*", headers: securityHeaders },
      // Where two rules match the same path and set the same header, the LAST
      // one wins (Next.js docs, "Headers"). So this replaces only the CSP, on
      // only the settings page that hosts the plan checkout. Sub-pages such as
      // /configuracion/facturacion (certificates and OSE credentials) keep the
      // strict policy.
      {
        source: "/dashboard/app/configuracion",
        headers: [{ key: "Content-Security-Policy", value: cspWithCulqi }],
      },
    ];
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
