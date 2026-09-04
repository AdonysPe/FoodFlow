import SiteShell from "@/components/SiteShell";
import LegalDoc from "@/components/sections/LegalDoc";
import { TERMS_DOC } from "@/lib/legal/terms";

export const metadata = {
  title: "Términos y Condiciones",
  description:
    "Condiciones de uso de FoodFlow: garantía de prueba sin riesgo los primeros 30 días, límites de responsabilidad y propiedad de tus datos, con exportación en 48 horas.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <SiteShell>
      <LegalDoc doc={TERMS_DOC} />
    </SiteShell>
  );
}
