import { Archivo, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT, ThemeProvider } from "@/components/ThemeContext";
import Analytics from "@/components/Analytics";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SOCIAL_DESCRIPTION,
  SOCIAL_TITLE,
} from "@/lib/seo";

const rawGaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/.test(rawGaId) ? rawGaId : null;

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Google ignores this tag for ranking. It is kept because Bing still reads
  // it and because it documents, in one place, the queries the copy is aimed
  // at — if a phrase here is nowhere in the page text, the page is the thing
  // that needs fixing.
  keywords: [
    "sistema para restaurantes Lima",
    "software para restaurantes Perú",
    "carta digital QR restaurante",
    "sistema de pedidos para restaurantes",
    "pantalla de cocina restaurante",
    "web de pedidos sin comisión",
    "alternativa a Rappi para restaurantes",
    "punto de venta para restaurantes Lima",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  // Stops iOS Safari turning stray digits in the copy (prices, "48 horas")
  // into tappable phone links.
  formatDetection: { telephone: false, address: false, email: false },
  // The canonical is declared per page, not here: this object is inherited by
  // /login and /dashboard too, and a canonical of "/" on those would tell
  // Google every private route is a duplicate of the home page.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use the full snippet and a large image in the result —
      // the defaults are conservative and cost clicks.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "es_PE",
    // `images` is deliberately absent: app/opengraph-image.jsx is a file
    // convention and Next appends it here. Naming one would override it.
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to claim the property
  // in Search Console without shipping an HTML file. Undefined renders no tag.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport = {
  // The dark ground, because that is what every route renders by default.
  // ThemeProvider rewrites this tag when the landing page switches to light,
  // so the browser chrome follows the site rather than the visitor's OS.
  // `colorScheme` is deliberately not set: globals.css declares it per theme,
  // and a hard "dark" would keep the UA in dark form controls on paper.
  themeColor: "#0c0908",
};

export default function RootLayout({ children }) {
  return (
    // The pre-paint script writes data-theme onto this element before React
    // hydrates, which is the whole point of it — so the one attribute React
    // is about to find and not recognise is expected, not a bug.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${archivo.variable} ${bricolage.variable}`}
    >
      <body className="antialiased">
        {GA_MEASUREMENT_ID && <Analytics measurementId={GA_MEASUREMENT_ID} />}
        {/* Applies the stored theme before the first paint, so a visitor who
            chose light never sees a black frame flash first. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Ir al contenido
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
