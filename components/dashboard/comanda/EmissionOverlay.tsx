"use client";

import Link from "next/link";
import { formatPrice } from "@/components/dashboard/menu/ui";

export type EmissionView =
  | { phase: "sending"; documentNo: string | null }
  | {
      phase: "accepted";
      documentNo: string;
      hash: string | null;
      customerEmail: string | null;
      orderId: string;
    }
  | {
      phase: "failed";
      message: string;
      orderId: string;
      /** Only a configuration problem can be fixed from the settings screen. */
      configurable: boolean;
      retrying: boolean;
    };

/**
 * Componente 7 — los estados de emisión.
 *
 * Covers the sheet once the waiter commits, because from that point there is
 * exactly one thing to do and it is not on the form behind it. The charge is
 * already recorded when any of these render: the diner paid, and no answer
 * from SUNAT changes that — which is why the failure state offers the internal
 * ticket rather than sending the waiter back to the till.
 */
export default function EmissionOverlay({
  view,
  total,
  tableName,
  change,
  onRetry,
  onClose,
}: {
  view: EmissionView;
  total: number;
  tableName: string;
  change: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink-950/95 px-6 py-10 text-center backdrop-blur-sm"
    >
      {view.phase === "sending" && (
        <>
          <span
            aria-hidden
            className="h-12 w-12 animate-spin rounded-full border-[3px] border-fg/15 border-t-accent-400"
          />
          <h2 className="mt-5 font-display text-[19px] font-bold tracking-[-0.02em] text-fg">
            Enviando comprobante a SUNAT…
          </h2>
          <p className="mt-1.5 text-[13px] text-fg/45">
            Esto puede tomar unos segundos. No cierres la comanda.
          </p>
          {view.documentNo && (
            <p className="mt-3 font-mono text-[13px] text-fg/35">{view.documentNo}</p>
          )}
        </>
      )}

      {view.phase === "accepted" && (
        <>
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-[30px] font-bold text-ok-ink"
          >
            ✓
          </span>
          <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-[-0.02em] text-fg">
            {view.documentNo} emitida correctamente
          </h2>
          <p className="mt-1 text-[13.5px] text-fg/55">
            {tableName} · {formatPrice(total)}
          </p>
          {change > 0 && (
            <p className="mt-3 rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 py-2 text-[14px] font-semibold text-fg">
              Vuelto {formatPrice(change)}
            </p>
          )}
          {view.hash && (
            <p className="mt-3 font-mono text-[12px] text-fg/35">
              Hash {view.hash.slice(0, 12)}…
            </p>
          )}
          {view.customerEmail && (
            <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-fg/35">
              Tu OSE envía el XML y el PDF a {view.customerEmail}.
            </p>
          )}

          <div className="mt-8 flex w-full max-w-[320px] flex-col gap-2">
            <Link
              href={`/dashboard/boleta/${view.orderId}?auto=1`}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent active:scale-[0.98]"
            >
              Imprimir ticket
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[14px] font-medium text-fg/70 active:scale-[0.98]"
            >
              Cerrar
            </button>
          </div>
        </>
      )}

      {view.phase === "failed" && (
        <>
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15 text-[28px] font-bold text-accent-label"
          >
            ×
          </span>
          <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-[-0.02em] text-fg">
            No se pudo emitir el comprobante
          </h2>
          <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-fg/55">
            {view.message}
          </p>
          <p className="mt-3 rounded-xl border border-ok/25 bg-ok/[0.07] px-4 py-2 text-[12.5px] font-medium text-ok-ink">
            El cobro de {formatPrice(total)} sí quedó registrado.
          </p>

          <div className="mt-7 flex w-full max-w-[320px] flex-col gap-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={view.retrying}
              className="h-12 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent active:scale-[0.98] disabled:opacity-40"
            >
              {view.retrying ? "Reintentando…" : "Reintentar"}
            </button>
            <Link
              href={`/dashboard/boleta/${view.orderId}?auto=1`}
              className="flex h-11 w-full items-center justify-center rounded-xl border border-fg/[0.12] bg-fg/[0.05] text-[14px] font-medium text-fg/75 active:scale-[0.98]"
            >
              Imprimir nota de venta
            </Link>
            {view.configurable && (
              <Link
                href="/dashboard/app/configuracion/facturacion"
                className="flex h-10 w-full items-center justify-center text-[13px] font-medium text-fg/45 underline underline-offset-2 hover:text-fg/70"
              >
                Ir a Configuración › Facturación
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-full text-[13px] font-medium text-fg/40 hover:text-fg/70"
            >
              Cerrar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
