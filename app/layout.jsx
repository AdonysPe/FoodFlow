import { Archivo, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/components/ThemeContext";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SOCIAL_DESCRIPTION,
} from "@/lib/seo";

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
  keywords: [
    "software para restaurantes Lima",
    "sistema de pedidos restaurante",
    "carta QR",
    "pantalla de cocina",
    "gestión de restaurantes Perú",
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SOCIAL_DESCRIPTION,
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "es_PE",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SOCIAL_DESCRIPTION,
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
        {/* Applies the stored theme before the first paint, so a visitor who
            chose light never sees a black frame flash first. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
        >
          Ir al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
