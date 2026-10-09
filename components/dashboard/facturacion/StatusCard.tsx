"use client";

import { formatBillingDate, type BillingReadiness, type ChecklistItem } from "@/lib/billing/settings";

const HEADLINE: Record<BillingReadiness, { title: string; dot: string; bg: string; bd: string }> = {
  complete: { title: "Configuración completa · listo para emitir", dot: "#3ddc97", bg: "rgba(61,220,151,0.06)", bd: "rgba(61,220,151,0.28)" },
  incomplete: { title: "Configuración incompleta · faltan campos", dot: "#ff5a33", bg: "rgba(255,90,51,0.06)", bd: "rgba(255,90,51,0.28)" },
  unset: { title: "Sin configurar", dot: "#6f675e", bg: "rgba(243,239,230,0.03)", bd: "rgba(243,239,230,0.08)" },
};

/**
 * The state of the configuration, design B.
 *
 * Deliberately the first thing on the page: an owner who opened this screen is
 * asking one question ("¿ya puedo emitir?") and the progress bar and the four
 * lines below answer it without expanding a single section.
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
    <section className="lbd-bl-status lbd-rise" style={{ background: head.bg, borderColor: head.bd, animationDelay: ".04s" }} aria-label="Estado de la facturación">
      <div className="lbd-bl-status-main">
        <span className="lbd-mono lbd-bl-eyebrow">¿YA PUEDO EMITIR?</span>
        <span className="lbd-bl-status-title lbd-display">
          <i style={{ background: head.dot }} aria-hidden />
          {head.title}
        </span>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }} aria-hidden>
          {items.map((item) => (
            <span key={item.key} style={{ flex: 1, height: 5, borderRadius: 5, transition: "background .4s", background: item.done ? "#3ddc97" : "rgba(243,239,230,0.1)" }} />
          ))}
        </div>
        <ul className="lbd-bl-checks">
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={() => onJump(item.key)} title={item.detail}>
                <span aria-hidden className="lbd-bl-check" data-done={item.done}>
                  {item.done ? "✓" : "×"}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <dl className="lbd-bl-status-meta">
        <div>
          <dt>Próximo correlativo</dt>
          <dd className="lbd-mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {nextDocument}
          </dd>
        </div>
        <div>
          <dt>Cobros este mes</dt>
          <dd className="lbd-display" style={{ fontSize: 22, fontWeight: 650 }}>
            {issuedThisMonth}
          </dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd style={{ fontSize: 14, fontWeight: 550 }}>{updatedAt ? formatBillingDate(updatedAt) : "Nunca"}</dd>
        </div>
      </dl>
    </section>
  );
}
