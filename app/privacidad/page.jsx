import SiteShell from "@/components/SiteShell";
import LegalDoc from "@/components/sections/LegalDoc";
import { PRIVACY_DOC } from "@/lib/legal/privacy";

export const metadata = {
  title: "Política de Privacidad",
  description:
    "Qué datos personales tratamos en FoodFlow, con qué finalidad y cómo ejercer tus derechos ARCO conforme a la Ley 29733. No vendemos datos a terceros.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <LegalDoc doc={PRIVACY_DOC} />
    </SiteShell>
  );
}
