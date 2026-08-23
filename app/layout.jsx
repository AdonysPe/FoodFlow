import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://foodflow.app"),
  title: {
    default: "FoodFlow — Turn Your Restaurant Into a Smart Business",
    template: "%s · FoodFlow",
  },
  description:
    "FoodFlow unifies orders, kitchen operations and analytics in one real-time platform. Sell more, waste less, and decide with data.",
  keywords: [
    "restaurant POS",
    "order management",
    "restaurant analytics",
    "kitchen display system",
    "restaurant software",
  ],
  openGraph: {
    title: "FoodFlow — Turn Your Restaurant Into a Smart Business",
    description:
      "Orders, operations and analytics in one real-time platform built for restaurants.",
    type: "website",
    url: "/",
    siteName: "FoodFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoodFlow — Turn Your Restaurant Into a Smart Business",
    description:
      "Orders, operations and analytics in one real-time platform built for restaurants.",
  },
};

export const viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
