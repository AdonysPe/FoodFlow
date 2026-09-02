import { Archivo, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
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
  themeColor: "#0c0908",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${archivo.variable} ${bricolage.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          Ir al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
