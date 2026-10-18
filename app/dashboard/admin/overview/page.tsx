import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import PageHeader from "@/components/dashboard/PageHeader";
import PendingContacts from "@/components/dashboard/admin/PendingContacts";
import { PLAN_LABELS, PLAN_MONTHLY_NET_CENTS, type PlanValue } from "@/lib/plans";
import { formatCurrency, formatSoles } from "@/lib/format";

export const metadata = {
  title: "Resumen",
};

const DAY = 24 * 60 * 60 * 1000;

const SOURCE_LABEL: Record<string, string> = {
  web_form: "Formulario",
  calculadora: "Calculadora",
  whatsapp: "WhatsApp",
};

const SUBSCRIPTIONS: { status: string[]; label: string; color: string }[] = [
  { status: ["active"], label: "Activas", color: "#3ddc97" },
  { status: ["trialing"], label: "En prueba", color: "#f3efe6" },
  { status: ["pending"], label: "Por activar", color: "#a39b90" },
  { status: ["past_due"], label: "Pago atrasado", color: "#ff5a33" },
  { status: ["suspended", "cancelled"], label: "Suspendidas o canceladas", color: "#6f675e" },
];

const BILL_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "#3ddc97" },
  trialing: { label: "En prueba", color: "#f3efe6" },
  pending: { label: "Por activar", color: "#a39b90" },
  past_due: { label: "Pago atrasado", color: "#ff7a57" },
  suspended: { label: "Suspendido", color: "#8a8278" },
  cancelled: { label: "Cancelado", color: "#8a8278" },
};

const PLAN_TONE: Record<string, { bg: string; fg: string }> = {
  negocio: { bg: "#ff5a33", fg: "#0c0908" },
  servicio: { bg: "#f3efe6", fg: "#0c0908" },
  carta: { bg: "rgba(243,239,230,0.08)", fg: "#cfc7bb" },
};

// The audit log is written in English keys; the operator reads it in Spanish.
const ACTIVITY: Record<string, { label: string; color: string }> = {
  "auth.login": { label: "Inicio de sesión", color: "#3ddc97" },
  "auth.logout": { label: "Cierre de sesión", color: "#a39b90" },
  "menu.item.price_change": { label: "Cambio de precio", color: "#f3efe6" },
  "menu.item.delete": { label: "Plato eliminado", color: "#ff5a33" },
  "staff.add": { label: "Mozo agregado", color: "#c7bcff" },
  "staff.remove": { label: "Mozo quitado", color: "#c7bcff" },
  "lead.status_change": { label: "Contacto cambió de estado", color: "#ff7a57" },
  "restaurant.delete": { label: "Restaurante eliminado", color: "#ff5a33" },
};

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function ago(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const month = (await searchParams).rango === "30d";
  const days = month ? 30 : 7;
  const since = new Date(Date.now() - days * DAY);
  const before = new Date(Date.now() - days * 2 * DAY);

  const [contactsNow, contactsPrev, pendingCount, pending, byStatus, restaurants, recent, activity, funnelRows] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.count({ where: { createdAt: { gte: before, lt: since } } }),
    prisma.lead.count({ where: { status: "nuevo" } }),
    prisma.lead.findMany({ where: { status: "nuevo" }, orderBy: { createdAt: "asc" }, take: 5 }),
    prisma.restaurant.groupBy({ by: ["billingStatus"], _count: { _all: true } }),
    prisma.restaurant.findMany({ select: { plan: true, billingStatus: true } }),
    prisma.restaurant.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { id: true, name: true, plan: true, billingStatus: true, createdAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const total = restaurants.length;
  const paying = restaurants.filter((r) => r.billingStatus === "active");
  const mrr = paying.reduce((sum, r) => sum + (PLAN_MONTHLY_NET_CENTS[r.plan as PlanValue] ?? 0), 0) / 100;
  const trialing = restaurants.filter((r) => r.billingStatus === "trialing").length;
  const pastDue = await prisma.restaurant.findMany({ where: { billingStatus: "past_due" }, select: { id: true, name: true, plan: true }, take: 3 });

  const countOf = (statuses: string[]) => byStatus.filter((row) => statuses.includes(row.billingStatus)).reduce((sum, row) => sum + row._count._all, 0);
  const subs = SUBSCRIPTIONS.map((row) => ({ ...row, count: countOf(row.status) }));

  const stage = (key: string) => funnelRows.find((row) => row.status === key)?._count._all ?? 0;
  const nuevo = stage("nuevo");
  const contactado = stage("contactado");
  const cita = stage("cita");
  const cliente = stage("cliente");
  const funnel = [
    { label: "Nuevos", value: nuevo + contactado + cita + cliente, color: "#3a302b" },
    { label: "Contactados", value: contactado + cita + cliente, color: "#a39b90" },
    { label: "Con cita", value: cita + cliente, color: "#f3efe6" },
    { label: "Clientes", value: cliente, color: "#ff5a33" },
  ];
  const funnelMax = Math.max(1, funnel[0].value);
  const conversion = funnel[0].value > 0 ? Math.round((cliente / funnel[0].value) * 100) : 0;

  const limaHour = new Date(Date.now() - 5 * 3_600_000).getUTCHours();
  const greeting = limaHour < 12 ? "Buenos días" : limaHour < 19 ? "Buenas tardes" : "Buenas noches";
  const delta = pctChange(contactsNow, contactsPrev);

  const kpis: { label: string; value: string; note: string; tone: "good" | "accent" | "plain"; accent?: boolean }[] = [
    { label: "Ingreso mensual recurrente", value: formatCurrency(mrr), note: `${paying.length} ${paying.length === 1 ? "local paga" : "locales pagan"} · + IGV`, tone: "plain" },
    { label: "Restaurantes", value: String(total), note: trialing ? `${trialing} en prueba de 7 días` : "ninguno en prueba", tone: "plain" },
    {
      label: "Contactos nuevos",
      value: String(contactsNow),
      note: delta == null ? `últimos ${days} días` : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(0)}% vs. los ${days} días previos`,
      tone: delta != null && delta >= 0 ? "good" : "plain",
    },
    { label: "Por atender", value: String(pendingCount), note: pendingCount ? "Sin respuesta todavía" : "Todo al día", tone: pendingCount ? "accent" : "good", accent: pendingCount > 0 },
  ];

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="PLATAFORMA · RESUMEN" title={greeting} description={`Lo que pasó en FoodFlow en los últimos ${days} días: quién te escribió, quién paga y qué hay que atender.`}>
        <div className="lbd-seg" role="group" aria-label="Periodo">
          <Link href="/dashboard/admin/overview?rango=7d" className={month ? undefined : "is-on"} aria-current={month ? undefined : "page"}>
            7 días
          </Link>
          <Link href="/dashboard/admin/overview?rango=30d" className={month ? "is-on" : undefined} aria-current={month ? "page" : undefined}>
            30 días
          </Link>
        </div>
        <Link href="/dashboard/admin/restaurants" className="lbd-cta">
          + Nuevo restaurante
        </Link>
      </PageHeader>

      <div className="lbd-ad-kpis lbd-rise" style={{ animationDelay: ".05s" }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`lbd-card lbd-ad-kpi${kpi.accent ? " is-accent" : ""}`}>
            <span>{kpi.label}</span>
            <strong className="lbd-display">{kpi.value}</strong>
            <small data-tone={kpi.tone}>{kpi.note}</small>
          </div>
        ))}
      </div>

      <div className="lbd-ad-row">
        <section className="lbd-card lbd-card--glass lbd-ad-panel lbd-rise" style={{ flex: "2 1 460px", animationDelay: ".1s" }} aria-label="Por atender">
          <div className="lbd-ad-head">
            <span className="lbd-ad-h">
              Por atender <span className="lbd-ad-count" data-zero={pendingCount === 0}>{pendingCount}</span>
            </span>
            <Link href="/dashboard/admin/contactos" className="lbd-ad-link">
              Ver pipeline ›
            </Link>
          </div>
          <span className="lbd-ad-sub">Contactos nuevos que todavía nadie ha llamado. La promesa es responder en menos de 24 horas.</span>
          <PendingContacts
            contacts={pending.map((lead) => ({
              id: lead.id,
              nombre: lead.nombre,
              restaurante: lead.restaurante,
              whatsapp: lead.whatsapp,
              source: SOURCE_LABEL[lead.source] ?? lead.source,
              perdidaAnualLabel: lead.perdidaAnual != null ? formatSoles(lead.perdidaAnual) : null,
              createdAt: lead.createdAt.toISOString(),
            }))}
          />
        </section>

        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 280px", animationDelay: ".14s" }} aria-label="Suscripciones">
          <span className="lbd-ad-h">Suscripciones</span>
          {subs.map((row) => (
            <div key={row.label} className="lbd-ad-sub-row">
              <div>
                <span>
                  <i style={{ background: row.color }} aria-hidden />
                  {row.label}
                </span>
                <strong>{row.count}</strong>
              </div>
              <div className="lbd-track">
                <div className="lbd-bar" style={{ width: `${total ? Math.round((row.count / total) * 100) : 0}%`, background: row.color }} />
              </div>
            </div>
          ))}
          {pastDue.length > 0 && (
            <div className="lbd-ad-alert">
              <strong>
                {pastDue.length === 1 ? "1 pago atrasado" : `${pastDue.length} pagos atrasados`}
              </strong>
              <span>
                {pastDue.map((r) => `${r.name} · ${PLAN_LABELS[r.plan as PlanValue]}`).join(" · ")}
              </span>
              <Link href={`/dashboard/admin/restaurants/${pastDue[0].id}`} className="lbd-ad-link">
                Abrir el local ›
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="lbd-ad-row">
        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 380px", animationDelay: ".18s" }} aria-label="Embudo de contactos">
          <div className="lbd-ad-head">
            <span className="lbd-ad-h">Embudo de contactos</span>
            <span className="lbd-ad-sub">
              Conversión <strong style={{ color: "#f3efe6" }}>{conversion}%</strong>
            </span>
          </div>
          <div className="lbd-ad-funnel">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="lbd-ad-funnel-col">
                  <div style={{ height: `${Math.max(3, Math.round((step.value / funnelMax) * 100))}%`, background: step.color }} />
                </div>
                <strong className="lbd-display">{step.value}</strong>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lbd-card lbd-ad-panel lbd-rise" style={{ flex: "1 1 380px", animationDelay: ".22s" }} aria-label="Restaurantes recientes">
          <div className="lbd-ad-head">
            <span className="lbd-ad-h">Restaurantes recientes</span>
            <Link href="/dashboard/admin/restaurants" className="lbd-ad-link">
              Ver todos ›
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="lbd-ad-empty">Todavía no hay restaurantes.</p>
          ) : (
            recent.map((r) => {
              const tone = PLAN_TONE[r.plan] ?? PLAN_TONE.carta;
              const bill = BILL_LABEL[r.billingStatus] ?? { label: r.billingStatus, color: "#a39b90" };
              return (
                <Link key={r.id} href={`/dashboard/admin/restaurants/${r.id}`} className="lbd-ad-venue">
                  <span className="lbd-cu-av" style={{ background: "#3a302b", color: "#f3efe6", borderRadius: 10 }}>
                    {initials(r.name)}
                  </span>
                  <span className="lbd-ad-venue-text">
                    <strong>{r.name}</strong>
                    <small>Alta {ago(r.createdAt)}</small>
                  </span>
                  <span className="lbd-ad-plan" style={{ background: tone.bg, color: tone.fg }}>
                    {PLAN_LABELS[r.plan as PlanValue] ?? r.plan}
                  </span>
                  <span className="lbd-ad-bill" style={{ color: bill.color }}>
                    {bill.label}
                  </span>
                </Link>
              );
            })
          )}
        </section>
      </div>

      <section className="lbd-card lbd-ad-panel lbd-rise" style={{ animationDelay: ".26s" }} aria-label="Actividad reciente">
        <div className="lbd-ad-head">
          <span className="lbd-ad-h">Actividad reciente</span>
          <Link href="/dashboard/admin/audit" className="lbd-ad-link">
            Auditoría completa ›
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="lbd-ad-empty">Todavía no hay actividad registrada.</p>
        ) : (
          activity.map((entry) => {
            const meta = ACTIVITY[entry.action] ?? { label: entry.action, color: "#a39b90" };
            return (
              <div key={entry.id} className="lbd-ad-act">
                <i style={{ background: meta.color }} aria-hidden />
                <span>
                  {meta.label}
                  {entry.actorEmail ? <span> · {entry.actorEmail}</span> : null}
                </span>
                <time className="lbd-mono" dateTime={entry.createdAt.toISOString()}>
                  {ago(entry.createdAt)}
                </time>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
