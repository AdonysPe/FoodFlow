import SiteShell from "@/components/SiteShell";
import CookiePolicy from "@/components/sections/CookiePolicy";

export const metadata = {
  title: "Política de cookies",
  description:
    "Qué guardamos en tu navegador cuando visitas FoodFlow y para qué. Solo lo necesario: sesión e idioma, sin publicidad ni rastreo de terceros.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <SiteShell>
      <CookiePolicy />
    </SiteShell>
  );
}
