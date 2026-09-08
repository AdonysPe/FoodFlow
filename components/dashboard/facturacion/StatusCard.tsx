"use client";

import { formatBillingDate, type BillingReadiness, type ChecklistItem } from "@/lib/billing/settings";

const HEADLINE: Record<BillingReadiness, { icon: string; title: string; skin: string }> = {
  complete: {
    icon: "✓",
    title: "Configuración completa · listo para emitir",
    skin: "border-ok/30 bg-ok/[0.07] text-ok-ink",
  },
  incomplete: {
    icon: "!",
    title: "Configuración incompleta · faltan campos",
    skin: "border-warn/30 bg-warn/[0.07] text-warn-ink",
  },
  unset: {
    icon: "×",
    title: "Sin configurar",
    skin: "border-fg/[0.1] bg-fg/[0.03] text-muted",
  },
};

/**
 * Componente 3 — el estado de la configuración.
 *
 * Deliberately the first thing on the page: an owner who opened this screen is
 * asking one question ("¿ya puedo emitir?") and the four lines below answer it
 * without expanding a single section.
 */
export default function StatusCard({
  readiness,
  items,
  updatedAt,
  issuedThisMonth,
  nextDocument,
  onJump,
}: {
  readiness: BillingReadiness;
  items: ChecklistItem[];
  updatedAt: string | null;
  issuedThisMonth: number;
  /** e.g. "B001-00000046" — what the next boleta will be numbered. */
  nextDocument: string;
  onJump: (key: ChecklistItem["key"]) => void;
}) {
  const head = HEADLINE[readiness];

  return (
    <section className={`rounded-2xl border p-5 ${head.skin}`}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/[0.08] text-[15px] font-bold"
        >
          {head.icon}
        </span>
        <h3 className="text-[14.5px] font-semibold">{head.title}</h3>
      </div>

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onJump(item.key)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-fg/[0.05]"
            >
              <span
                aria-hidden
                className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  item.done ? "bg-ok/20 text-ok-ink" : "bg-fg/[0.08] text-faint"
                }`}
              >
                {item.done ? "✓" : "×"}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[12.5px] font-medium ${
                    item.done ? "text-fg/70" : "text-fg/85"
                  }`}
                >
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">
                  {item.detail}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-fg/[0.07] pt-3.5 text-[11.5px]">
        <div>
          <dt className="text-faint">Última actualización</dt>
          <dd className="mt-0.5 font-medium text-muted">
            {updatedAt ? formatBillingDate(updatedAt) : "Nunca"}
          </dd>
        </div>
        <div>
          <dt className="text-faint">Cobros este mes</dt>
          <dd className="mt-0.5 font-medium text-muted tabular-nums">{issuedThisMonth}</dd>
        </div>
        <div>
          <dt className="text-faint">Próximo correlativo</dt>
          <dd className="mt-0.5 font-mono font-medium text-muted">{nextDocument}</dd>
        </div>
      </dl>
    </section>
  );
}
