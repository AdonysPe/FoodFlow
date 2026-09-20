import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireComandaRestaurant } from "@/lib/auth/restaurant";
import { readReceiptSettings } from "@/lib/db/receiptSettings";
import { buildReceipt } from "@/lib/receipt";
import { sunatQrDataUrl } from "@/lib/billing/qr";
import ReceiptDoc from "@/components/dashboard/boleta/ReceiptDoc";
import ReceiptActions from "@/components/dashboard/boleta/ReceiptActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Boleta",
  robots: { index: false, follow: false },
};

/**
 * One charged order, on paper.
 *
 * Reachable by both the owner and their waiters — whoever is at the till is
 * the one who has to hand the ticket over. The order is looked up scoped to
 * the restaurant, so an id from another venue is a 404, not someone else's
 * sales.
 */
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ auto?: string; from?: string }>;
}) {
  const { restaurant } = await requireComandaRestaurant();
  if (!restaurant) notFound();

  const [{ orderId }, { auto, from }] = await Promise.all([params, searchParams]);

  const [order, settings] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      select: {
        items: true,
        deliveryFee: true,
        total: true,
        channel: true,
        customerName: true,
        serverName: true,
        roundNumber: true,
        paidAt: true,
        voidedAt: true,
        paymentMethod: true,
        amountReceived: true,
        changeGiven: true,
        receiptSeries: true,
        receiptNumber: true,
        documentType: true,
        docSeries: true,
        docNumber: true,
        billingDocType: true,
        billingDocId: true,
        billingName: true,
        billingAddress: true,
        sunatStatus: true,
        sunatHash: true,
        table: { select: { name: true } },
      },
    }),
    readReceiptSettings(restaurant.id),
  ]);

  if (!order) notFound();

  // Only a comprobante SUNAT accepted gets a QR, and it is drawn here rather
  // than in the shared builder because generating it is async and server-side.
  const qrDataUrl = await sunatQrDataUrl(order, settings);

  const receipt = buildReceipt(order, settings.tradeName || restaurant.name, settings, {
    qrDataUrl,
  });
  const fromOrders = from === "orders";
  const backHref = fromOrders ? "/dashboard/app/orders" : "/dashboard/comanda";
  const backLabel = fromOrders ? "Volver a pedidos" : "Volver a la comanda";

  return (
    <main className="flex min-h-screen flex-col items-center gap-5 bg-ink-950 px-4 py-8 print:bg-white print:p-0">
      {/* Sized per roll so the driver receives the width the paper really is.
          Everything but the paper is hidden rather than removed — a printer
          that ignores `display:none` on an ancestor still respects this. */}
      <style>{`
        @page { size: ${receipt.paperWidth}mm auto; margin: 0; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          #receipt-paper, #receipt-paper * { visibility: visible !important; }
          #receipt-paper { position: absolute; left: 0; top: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {order.voidedAt && (
        <p className="no-print w-full max-w-[380px] rounded-xl border border-accent-400/30 bg-accent-400/10 px-4 py-3 text-center text-[13px] text-accent-label">
          Esta cuenta fue anulada. El documento queda solo como constancia.
        </p>
      )}
      {!order.paidAt && !order.voidedAt && (
        <p className="no-print w-full max-w-[380px] rounded-xl border border-fg/[0.12] bg-fg/[0.05] px-4 py-3 text-center text-[13px] text-muted">
          Cuenta todavía abierta. Esto es una precuenta para que la mesa revise su
          consumo; el número de documento se asigna al cobrar.
        </p>
      )}

      <div className="shadow-lift print:shadow-none">
        <ReceiptDoc receipt={receipt} />
      </div>

      <ReceiptActions
        auto={auto === "1"}
        label={
          receipt.kind === "precuenta"
            ? "Imprimir precuenta"
            : receipt.electronic
              ? "Imprimir comprobante"
              : "Imprimir nota de venta"
        }
        backHref={backHref}
        backLabel={backLabel}
      />
    </main>
  );
}
