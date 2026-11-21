import SiteShell from "@/components/SiteShell";
import { HomeJsonLd } from "@/components/seo/JsonLd";
import HomeHero from "@/components/home/HomeHero";
import {
  Ribbon,
  QrScene,
  Story,
  Manifesto,
  DayScene,
  Modules,
  Commission,
  Pilot,
  Plans,
  Closing,
} from "@/components/home/HomeSections";
// Home-only styles: the scroll scenes. Imported here so no other route loads them.
import "./home.css";

// Title and description live in the root layout (this page is the default
// for both); the canonical does not inherit, so it is declared here rather
// than in the layout, where /login and /dashboard would pick it up too.
export const metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home page, design B ("Noche"), with scroll scenes. It keeps the shared
 * shell — chat, WhatsApp button, lead form, exit intent, cookie banner,
 * intro curtain — and brings its own header and footer.
 *
 * Pinned scenes (QR, the three screens, the day, 30% → 0%, the closing)
 * alternate with ordinary sections so the scroll never stays pinned for
 * long. All motion is CSS scroll timelines; see app/home.css.
 */
export default function Page() {
  return (
    <SiteShell intro>
      <HomeJsonLd />
      <HomeHero />
      <Ribbon />
      <QrScene />
      <Story />
      <Manifesto />
      <DayScene />
      <Modules />
      <Commission />
      <Pilot />
      <Plans />
      <Closing />
    </SiteShell>
  );
}
