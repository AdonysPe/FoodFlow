import Link from "next/link";
import { buildWhatsAppUrl } from "@/lib/contact";
import {
  FEATURE_LABELS,
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICES,
  type PlanValue,
} from "@/lib/plans";

// The Carta plan has no orders, so the usual sales tiles would all read zero
// forever. This is the overview that plan actually earns: the state of the
// menu, plus an honest look at what the next plan turns on.
const ICONS = {
  book: "M5 4.5h10a4 4 0 0 1 4 4v11H9a4 4 0 0 1-4-4zM9 9.5h6M9 13.5h4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  bolt: "M13 3L5 13.5h6L10 21l9-11h-6z",
};

export default function CartaOverview({
  restaurantName,
  plan,
  itemCount,
  availableCount,
  categoryCount,
  soldOut,
  slug = null,
}: {
  restaurantName: string;
  plan: PlanValue;
  itemCount: number;
  availableCount: number;
  categoryCount: number;
  soldOut: { id: string; name: string }[];
  slug?: string | null;
}) {
  const next: PlanValue = "servicio";
  const unlocks = PLAN_FEATURES[next].filter((f) => !PLAN_FEATURES[plan].includes(f));
  const whatsapp = buildWhatsAppUrl(`Hola FoodFlow, quiero subir ${restaurantName} al plan ${PLAN_LABELS[next]}.`);
  const availablePct = itemCount ? Math.round((availableCount / itemCount) * 100) : 0;
  const stats = [
    { label: "Platos en la carta", value: itemCount, icon: ICONS.book, tone: "plain" },
    { label: "Disponibles", value: availableCount, icon: ICONS.check, tone: "good", bar: itemCount > 0 },
    { label: "Categorías", value: categoryCount, icon: ICONS.bolt, tone: "accent" },
  ];

  return (
    <div className="lbd-pg">
      <div className="lbd-co-head lbd-rise">
        <div>
          <span className="lbd-mono lbd-co-eyebrow">RESUMEN · PLAN {PLAN_LABELS[plan].toUpperCase()}</span>
          <h1 className="lbd-ph-h1">
            {restaurantName}
            <span style={{ color: "#ff5a33" }}>.</span>
          </h1>
          <span className="lbd-co-sub">Plan {PLAN_LABELS[plan]} · tu carta digital</span>
        </div>
        <div className="lbd-co-actions">
          {slug && (
            <Link href={`/carta/${slug}`} target="_blank" rel="noopener noreferrer" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
              Ver mi carta ↗
            </Link>
          )}
          <Link href="/dashboard/app/menu" className="lbd-btn lbd-btn--solid lbd-btn--sm">
            Ir a la carta
          </Link>
        </div>
      </div>

      <div className="lbd-co-stats lbd-rise" style={{ animationDelay: ".05s" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="lbd-card lbd-co-stat" data-tone={stat.tone}>
            <span>
              <i aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={stat.icon} />
                </svg>
              </i>
              {stat.label}
            </span>
            <strong className="lbd-display">{stat.value}</strong>
            {stat.bar && (
              <span className="lbd-co-bar" aria-hidden="true">
                <span style={{ width: `${availablePct}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="lbd-co-row">
        <section className="lbd-card lbd-co-panel lbd-rise" style={{ animationDelay: ".1s" }} aria-label="Agotados hoy">
          <div className="lbd-co-panel-head">
            <strong>Agotados hoy</strong>
            <Link href="/dashboard/app/menu" className="lbd-co-link">
              Ir a la carta ›
            </Link>
          </div>
          {itemCount === 0 ? (
            <div className="lbd-co-empty">
              <span aria-hidden="true">+</span>
              <p>Tu carta está vacía. Agrega tu primer plato.</p>
              <Link href="/dashboard/app/menu" className="lbd-btn lbd-btn--cream lbd-btn--sm">
                Agregar un plato
              </Link>
            </div>
          ) : soldOut.length === 0 ? (
            <p className="lbd-co-allgood">
              <span aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS.check} />
                </svg>
              </span>
              Todo disponible. Nada marcado como agotado.
            </p>
          ) : (
            <>
              <ul className="lbd-co-sold">
                {soldOut.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <em>Agotado</em>
                  </li>
                ))}
              </ul>
              {soldOut.length > 6 && <small className="lbd-co-more">y {soldOut.length - 6} más</small>}
            </>
          )}
        </section>

        <section className="lbd-co-next lbd-rise" style={{ animationDelay: ".15s" }} aria-label={`Con el plan ${PLAN_LABELS[next]}`}>
          <span className="lbd-mono lbd-co-next-eyebrow">SIGUIENTE PLAN</span>
          <div>
            <strong className="lbd-display">Con el plan {PLAN_LABELS[next]}</strong>
            <span>{PLAN_PRICES[next]}/mes · lo que se abre en este panel</span>
          </div>
          <ul>
            {unlocks.map((f, index) => (
              <li key={f}>
                <svg style={{ animationDelay: `${index * 0.4}s` }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b8401f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0" />
                </svg>
                {FEATURE_LABELS[f]}
              </li>
            ))}
          </ul>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="lbd-co-wa">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5fd6c5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" />
              </svg>
              Hablar para subir de plan
            </a>
          ) : (
            <Link href="/dashboard/app/configuracion" className="lbd-co-wa">
              Ver mi plan
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
