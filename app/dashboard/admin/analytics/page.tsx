import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import PageHeader from "@/components/dashboard/PageHeader";
import { PLAN_MONTHLY_NET_CENTS, type PlanValue } from "@/lib/plans";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Analítica",
};

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

const SOURCES: { key: string; label: string; color: string }[] = [
  { key: "calculadora", label: "Calculadora de comisiones", color: "#ff5a33" },
  { key: "web_form", label: "Formulario de la web", color: "#f3efe6" },
  { key: "whatsapp", label: "WhatsApp", color: "#5fd6c5" },
  { key: "chat", label: "Correo en el chat", color: "#a39b90" },
];

function dayKey(date: Date) {
  return new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const long = (await searchParams).rango === "90d";
  const days = long ? 90 : 30;
  const since = new Date(Date.now() - days * DAY);
  const before = new Date(Date.now() - days * 2 * DAY);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() - 5, 1);
  sixMonths.setHours(0, 0, 0, 0);

  const [leads, prevCount, chatLeads, payments, restaurants, idle, cancelled] = await Promise.all([
    prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, source: true, status: true } }),
    prisma.lead.count({ where: { createdAt: { gte: before, lt: since } } }),
    prisma.clientLead.count({ where: { createdAt: { gte: since } } }),
    prisma.subscriptionPayment.findMany({ where: { status: "succeeded", occurredAt: { gte: sixMonths } }, select: { amountCents: true, occurredAt: true } }),
    prisma.restaurant.findMany({ select: { plan: true, billingStatus: true } }),
    // Venues that have not taken a single order in the last 30 days.
    prisma.restaurant.count({ where: { orders: { none: { createdAt: { gte: new Date(Date.now() - 30 * DAY) } } } } }),
    prisma.restaurant.count({ where: { billingStatus: { in: ["cancelled", "suspended"] } } }),
  ]);

  // ---- contacts per day
  const perDay = new Map<string, number>();
  for (const lead of leads) perDay.set(dayKey(lead.createdAt), (perDay.get(dayKey(lead.createdAt)) ?? 0) + 1);
  const bars = Array.from({ length: days }, (_, i) => {
    const key = dayKey(new Date(Date.now() - (days - 1 - i) * DAY));
    return perDay.get(key) ?? 0;
  });
  const barMax = Math.max(1, ...bars);

  // ---- funnel (each step counts the ones that got that far)
  const stage = (statuses: string[]) => leads.filter((l) => statuses.includes(l.status)).length;
  const funnel = [
    { label: "Contactos", value: leads.length, color: "#a39b90" },
    { label: "Contactados", value: stage(["contactado", "cita", "cliente"]), color: "#f3efe6" },
    { label: "Con cita", value: stage(["cita", "cliente"]), color: "#c7bcff" },
    { label: "Clientes", value: stage(["cliente"]), color: "#ff5a33" },
  ];

  // ---- sources
  const bySource = SOURCES.map((s) => ({ ...s, value: s.key === "chat" ? chatLeads : leads.filter((l) => l.source === s.key).length }));
  const sourceTotal = bySource.reduce((sum, s) => sum + s.value, 0);

  // ---- money
  const paying = restaurants.filter((r) => r.billingStatus === "active");
  const mrr = paying.reduce((sum, r) => sum + (PLAN_MONTHLY_NET_CENTS[r.plan as PlanValue] ?? 0), 0) / 100;
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(sixMonths);
    d.setMonth(sixMonths.getMonth() + i);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], total: 0 };
  });
  for (const payment of payments) {
    const slot = months.find((m) => m.key === `${payment.occurredAt.getFullYear()}-${payment.occurredAt.getMonth()}`);
    if (slot) slot.total += payment.amountCents / 100;
  }
  const monthMax = Math.max(1, ...months.map((m) => m.total));
  const anyPayment = months.some((m) => m.total > 0);

  const delta = prevCount > 0 ? ((leads.length - prevCount) / prevCount) * 100 : null;
  const pastDue = restaurants.filter((r) => r.billingStatus === "past_due").length;
  const first = new Date(Date.now() - (days - 1) * DAY);

  const kpis: { label: string; value: string; note: string; good?: boolean }[] = [
    { label: "Contactos", value: String(leads.length), note: delta == null ? `últimos ${days} días` : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(0)}% vs. el periodo anterior`, good: delta != null && delta >= 0 },
    { label: "Nuevos clientes", value: String(funnel[3].value), note: `conversión ${pct(funnel[3].value, funnel[0].value)}%` },
    { label: "Ingreso recurrente", value: formatCurrency(mrr), note: `${paying.length} ${paying.length === 1 ? "local paga" : "locales pagan"} · sin IGV` },
    { label: "Ticket medio", value: paying.length ? formatCurrency(mrr / paying.length) : "—", note: "por local al mes, sin IGV" },
  ];

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="CLIENTES · ANALÍTICA" title="Analítica" description="De dónde llegan los restaurantes, cuántos se quedan y cuánto entra cada mes.">
        <div className="lbd-seg" role="group" aria-label="Periodo">
          <Link href="/dashboard/admin/analytics?rango=30d" className={long ? undefined : "is-on"} aria-current={long ? undefined : "page"}>
            30 días
          </Link>
          <Link href="/dashboard/admin/analytics?rango=90d" className={long ? "is-on" : undefined} aria-current={long ? "page" : undefined}>
            90 días
          </Link>
        </div>
      </PageHeader>

      <div className="lbd-ad-kpis lbd-rise" style={{ animationDelay: ".04s" }}>
        {kpis.map((k) => (
          <div key={k.label} className="lbd-card lbd-ad-kpi">
            <span>{k.label}</span>
            <strong className="lbd-display">{k.value}</strong>
            <small data-tone={k.good ? "good" : "plain"}>{k.note}</small>
          </div>
        ))}
      </div>

      <div className="lbd-ad-row">
        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "2 1 460px", animationDelay: ".08s" }} aria-label="Contactos por día">
          <div className="lbd-ad-head">
            <span className="lbd-ad-h">Contactos nuevos por día</span>
            <span className="lbd-ad-sub">{leads.length} en el periodo</span>
          </div>
          <div className="lbd-ad-bars">
            {bars.map((v, i) => (
              <span key={i} className="lbd-an-grow" title={`${v} contactos`} style={{ height: `${Math.max(3, Math.round((v / barMax) * 100))}%`, background: i === bars.length - 1 ? "#ff5a33" : v === 0 ? "rgba(243,239,230,0.08)" : "#3a302b", animationDelay: `${(i * 0.015).toFixed(3)}s` }} />
            ))}
          </div>
          <div className="lbd-ad-axis lbd-mono">
            <span>{first.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span>
            <span>hoy</span>
          </div>
        </section>

        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 300px", animationDelay: ".12s" }} aria-label="Embudo de ventas">
          <span className="lbd-ad-h">Embudo de ventas</span>
          {funnel.map((f, i) => (
            <div key={f.label} className="lbd-ad-sub-row">
              <div>
                <span>{f.label}</span>
                <span>
                  <strong>{f.value}</strong>
                  {i > 0 && <span style={{ color: "#8a8278" }}> · {pct(f.value, funnel[i - 1].value)}% del paso anterior</span>}
                </span>
              </div>
              <div className="lbd-track lbd-track--thick">
                <div className="lbd-bar" style={{ width: `${pct(f.value, funnel[0].value)}%`, background: f.color }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="lbd-ad-row">
        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 300px", animationDelay: ".16s" }} aria-label="De dónde llegan">
          <span className="lbd-ad-h">De dónde llegan</span>
          {bySource.map((s) => (
            <div key={s.key} className="lbd-ad-sub-row">
              <div>
                <span>{s.label}</span>
                <span style={{ color: "#a39b90" }}>
                  {s.value} · {pct(s.value, sourceTotal)}%
                </span>
              </div>
              <div className="lbd-track">
                <div className="lbd-bar" style={{ width: `${pct(s.value, sourceTotal)}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </section>

        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 300px", animationDelay: ".2s" }} aria-label="Cobrado por mes">
          <div className="lbd-ad-head">
            <span className="lbd-ad-h">Cobrado por mes</span>
            <span className="lbd-ad-sub">con IGV</span>
          </div>
          {anyPayment ? (
            <div className="lbd-ad-months">
              {months.map((m, i) => (
                <div key={m.key}>
                  <span className="lbd-mono">{m.total ? `S/ ${Math.round(m.total).toLocaleString("es-PE")}` : "—"}</span>
                  <i className="lbd-an-grow" style={{ height: `${Math.max(2, Math.round((m.total / monthMax) * 100))}%`, background: i === months.length - 1 ? "#ff5a33" : "#3a302b", animationDelay: `${i * 0.08}s` }} />
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="lbd-ad-empty">Todavía no hay cobros con tarjeta. Aparecerán aquí cuando el primer local pague su suscripción.</p>
          )}
        </section>

        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 260px", animationDelay: ".24s" }} aria-label="Salud de los clientes">
          <span className="lbd-ad-h">Salud de los clientes</span>
          {[
            { label: "Pagos atrasados", value: String(pastDue), note: pastDue ? "Escríbeles hoy" : "Ninguno atrasado", good: pastDue === 0 },
            { label: "Locales sin pedidos (30 días)", value: String(idle), note: idle ? "Pueden necesitar ayuda para arrancar" : "Todos están usando el panel", good: idle === 0 },
            { label: "Bajas", value: String(cancelled), note: cancelled ? "Cancelados o suspendidos" : "Ningún local se fue", good: cancelled === 0 },
          ].map((h) => (
            <div key={h.label} className="lbd-ad-health">
              <span>{h.label}</span>
              <strong className="lbd-display">{h.value}</strong>
              <small style={{ color: h.good ? "#3ddc97" : "#a39b90" }}>{h.note}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
