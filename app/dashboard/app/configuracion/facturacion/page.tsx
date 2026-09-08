import Link from "next/link";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
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
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">
            Facturación electrónica
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-faint">
            Tu conexión con SUNAT y lo que se imprime al cobrar una mesa. Se configura una
            vez y sale igual en cada cobro, en efectivo, tarjeta o Yape.
          </p>
        </div>
        <Link
          href="/dashboard/app/orders"
          className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-2 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
        >
          Volver a pedidos
        </Link>
      </div>

      {/* The one thing an owner must not misunderstand about this screen. */}
      <div className="rounded-2xl border border-warn/25 bg-warn/[0.07] p-5">
        <h3 className="text-[13.5px] font-semibold text-warn-ink">
          Tu cuenta con el OSE es tuya, y hoy el ticket es una nota de venta
        </h3>
        <div className="mt-1.5 flex max-w-3xl flex-col gap-2 text-[12.5px] leading-relaxed text-muted">
          <p>
            FoodFlow guarda tu configuración y arma el comprobante, pero la cuenta con el
            OSE la contratas y la pagas tú directamente con el proveedor. Nadie más en
            FoodFlow ve tu certificado ni tus credenciales: quedan cifradas y aisladas de
            los demás restaurantes.
          </p>
          <p>
            Mientras el envío al OSE no esté activo, cada cobro imprime la nota de venta
            interna con tu numeración correlativa, y el ticket lo dice al pie. Un
            comprobante solo se llama boleta o factura electrónica cuando SUNAT lo aceptó.
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

      <section className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
        <h3 className="text-[14px] font-semibold text-fg">Conectar tu ticketera</h3>
        <p className="mt-1 text-[12.5px] text-faint">
          FoodFlow imprime por el navegador, así que sirve cualquier ticketera térmica que
          ya esté instalada en la caja. No hace falta comprar hardware nuevo.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {PRINTER_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-fg/[0.12] bg-fg/[0.04] text-[12px] font-semibold text-muted">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-fg/85">
                  {step.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-faint">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
