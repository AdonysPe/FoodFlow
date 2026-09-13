import SiteShell from "@/components/SiteShell";
import CookiePolicy from "@/components/sections/CookiePolicy";

export const metadata = {
  title: "Política de cookies",
  description:
    "Qué guardamos en tu navegador cuando visitas FoodFlow y para qué: sesión e idioma siempre, medición opcional con Google Analytics solo si la aceptas.",
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <SiteShell>
      <CookiePolicy />
    </SiteShell>
  );
}
