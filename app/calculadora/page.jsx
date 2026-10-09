import SiteShell from "@/components/SiteShell";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Calculator from "@/components/sections/Calculator";


export const metadata = {
  // The brands belong in the title because they are what gets typed: "cuánto
  // cobra Rappi de comisión" is the lowest-difficulty query this site can win.
  title: "Calculadora de comisiones de Rappi y PedidosYa",
  description:
    "Cuánto te cuestan al mes y al año las comisiones de Rappi, PedidosYa y las demás apps de delivery, con tus propios números. Sin registrarte.",
  alternates: { canonical: "/calculadora" },
};

/**
 * /calculadora, design B ("Noche"), as approved in the prototype. Same shell as
 * the home page with the B header and footer; the page is pinned to the night
 * design. The "your own ordering site" block and the closing call now live in
 * the calculator itself, so /web-de-pedidos keeps its own `CustomSite`.
 */
export default function CalculatorPage() {
  return (
    <SiteShell>
        <BreadcrumbJsonLd name="Calculadora de comisiones" path="/calculadora" />
        <Calculator as="h1" />
      </SiteShell>
  );
}
