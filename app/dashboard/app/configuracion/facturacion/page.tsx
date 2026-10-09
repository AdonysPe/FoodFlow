import Link from "next/link";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import PageHeader from "@/components/dashboard/PageHeader";
import BillingWorkspace from "@/components/dashboard/facturacion/BillingWorkspace";
import { readBillingConfig } from "@/lib/db/billing";

export const metadata = {
  title: "Facturación electrónica",
};

const PRINTER_STEPS = [
  {
    title: "Instala tu ticketera como impresora del sistema",
    body: "Conéctala por USB o red e instala el driver del fabricante (Epson, Bixolon, 3nStar, Xprinter). Cuando aparezca en la lista de impresoras de Windows o Android, ya está lista.",
  },
  {
    title: "Configura el papel en el driver",
    body: "En Preferencias de impresión elige el rollo que usas: 80 × 297 mm o 58 × 297 mm. Deja la altura en automático para que el ticket no salga cortado ni con papel de más.",
  },
  {
    title: "Quita márgenes y encabezados del navegador",
    body: "La primera vez que imprimas, en el diálogo del navegador abre Más ajustes y pon Márgenes en Ninguno y desmarca Encabezados y pies de página. El navegador lo recuerda para las siguientes.",
  },
  {
    title: "Déjala como impresora predeterminada de la caja",
    body: "Así cada cobro sale sin elegir impresora. Si la caja es un celular, comparte la ticketera por red y agrégala desde el servicio de impresión de Android.",
  },
];

export default async function BillingSettingsPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("orders");
  if (!allowed) return <PlanGate feature="orders" plan={plan} />;
  if (!restaurant) return null;

  const config = await readBillingConfig(restaurant.id);

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="CONFIGURACIÓN · FACTURACIÓN" title="Facturación electrónica" description="Tu conexión con SUNAT y lo que se imprime al cobrar una mesa. Se configura una vez y sale igual en cada cobro, en efectivo, tarjeta o Yape.">
        <Link href="/dashboard/app/configuracion" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
          Volver a Configuración
        </Link>
      </PageHeader>

      {/* The one thing an owner must not misunderstand about this screen. */}
      <div className="lbd-bl-callout lbd-rise" data-tone="warn" style={{ animationDelay: ".02s" }}>
        <strong>Tu cuenta con el OSE es tuya, y hoy el ticket es una nota de venta</strong>
        <div>
          <p style={{ margin: 0 }}>
            FoodFlow guarda tu configuración y arma el comprobante, pero la cuenta con el OSE la contratas y la pagas tú directamente con el proveedor. Nadie más en FoodFlow ve tu certificado ni tus credenciales: quedan cifradas y aisladas de los demás restaurantes.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            Mientras el envío al OSE no esté activo, cada cobro imprime la nota de venta interna con tu numeración correlativa, y el ticket lo dice al pie. Un comprobante solo se llama boleta o factura electrónica cuando SUNAT lo aceptó.
          </p>
        </div>
      </div>

      <BillingWorkspace
        venueName={restaurant.name}
        initial={config.settings}
        cert={config.cert}
        ose={config.ose}
        apiKeyHint={config.apiKeyHint}
        secretHint={config.secretHint}
        notaVentaSeries={config.notaVentaSeries}
        notaVentaNext={config.notaVentaNext}
        issuedThisMonth={config.issuedThisMonth}
      />

      <section className="lbd-card lbd-bl-printer">
        <h2 className="lbd-cf-h" style={{ fontSize: 22 }}>
          Conectar tu ticketera
        </h2>
        <p className="lbd-cf-p">
          FoodFlow imprime por el navegador, así que sirve cualquier ticketera térmica que ya esté instalada en la caja. No hace falta comprar hardware nuevo.
        </p>
        <ol className="lbd-bl-steps">
          {PRINTER_STEPS.map((step, i) => (
            <li key={step.title}>
              <span aria-hidden className="lbd-bl-badge lbd-mono">
                {i + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.body}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
