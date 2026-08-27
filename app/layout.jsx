import { Archivo, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL("https://foodflow.app"),
  title: {
    default: "FoodFlow — Tu restaurante funcionando en 48 horas",
    template: "%s · FoodFlow",
  },
  description:
    "Programa piloto en Lima: montamos tu carta, tus canales de pedido, la pantalla de cocina y tus números en un solo panel. Primer mes gratis.",
  keywords: [
    "software para restaurantes Lima",
    "sistema de pedidos restaurante",
    "carta QR",
    "pantalla de cocina",
    "gestión de restaurantes Perú",
  ],
  openGraph: {
    title: "FoodFlow — Tu restaurante funcionando en 48 horas",
    description:
      "Pedidos, cocina, carta y números en un solo panel. Programa piloto en Lima con plazas limitadas.",
    type: "website",
    url: "/",
    siteName: "FoodFlow",
    locale: "es_PE",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoodFlow — Tu restaurante funcionando en 48 horas",
    description:
      "Pedidos, cocina, carta y números en un solo panel. Programa piloto en Lima con plazas limitadas.",
  },
};

export const viewport = {
  themeColor: "#0b0c0e",
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
