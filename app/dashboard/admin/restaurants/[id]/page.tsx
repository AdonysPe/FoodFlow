import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import RestaurantConfigForm from "@/components/dashboard/admin/RestaurantConfigForm";
import RestaurantAccountPanel from "@/components/dashboard/admin/RestaurantAccountPanel";
import { BILLING, initialsOf } from "@/components/dashboard/RestaurantsTable";
import { PLAN_LABELS, type PlanValue } from "@/lib/plans";
import { hasLiveProviderSubscription } from "@/lib/subscriptions/access";
import { formatCurrency } from "@/lib/format";

export const metadata = {
  title: "Configurar restaurante",
};

const SOURCE_LABEL: Record<string, string> = {
  none: "Nadie todavía",
  manual: "Asignado a mano",
  provider: "Suscripción con tarjeta",
};

const DAY = 24 * 60 * 60 * 1000;

function dateLabel(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

function ago(date: Date | null): string {
  if (!date) return "Sin actividad";
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "Hace un momento";
  if (hours < 24) return "Hoy";
  const days = Math.floor(hours / 24);
  return days === 1 ? "Ayer" : `Hace ${days} días`;
}

function templateName(value: string | null, categoryDefault: string) {
  return menuTemplates[resolveMenuTemplate(value, categoryDefault)].name;
}

export default async function RestaurantConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Throws for anyone who is not the operator, before a single row is read —
  // so this page cannot leak the existence of a venue to a tenant who guessed
  // the URL. The admin layout above redirects them first; this is the backstop.
  await requirePermission(PERMISSIONS.MANAGE_CATEGORY_TEMPLATE);
  const { id } = await params;
  const since = new Date(Date.now() - 30 * DAY);

  const [restaurant, categories] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: { select: { email: true } },
        category: { select: { id: true, name: true, defaultMenuTemplate: true } },
        tables: {
          where: { active: true, publicCode: { not: null } },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { publicCode: true },
        },
        _count: { select: { staff: true } },
      },
    }),
    // Only assignable categories are offered. An inactive one is still shown
    // further down if this venue happens to carry it, so the screen never
    // silently misreports what a restaurant is filed under.
    prisma.restaurantCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, defaultMenuTemplate: true },
    }),
  ]);

  if (!restaurant) notFound();

  const [history, usage, lastOrder, subscription] = await Promise.all([
    prisma.restaurantConfigurationAudit.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.aggregate({
      where: { restaurantId: restaurant.id, createdAt: { gte: since }, voidedAt: null },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.findFirst({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.subscription.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { createdAt: "desc" },
      select: { trialEndsAt: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, grossAmountCents: true },
    }),
  ]);

  const previewCode = restaurant.tables[0]?.publicCode ?? null;
  const categoryIsRetired = !categories.some((category) => category.id === restaurant.categoryId);
  const bill = BILLING[restaurant.billingStatus];
  const orders = usage._count._all;
  const locked = hasLiveProviderSubscription(restaurant);

  const nextDate = restaurant.billingStatus === "trialing" ? subscription?.trialEndsAt : subscription?.currentPeriodEnd ?? restaurant.accessUntil;
  const nextLine = restaurant.billingStatus === "trialing" ? "La prueba termina" : restaurant.billingSource === "manual" ? "Acceso hasta" : "Próximo cobro";
  const nextValue = nextDate ? dateLabel(nextDate) : restaurant.billingSource === "manual" ? "Sin fecha de fin" : "—";

  return (
    <div className="lbd-pg">
      <Link href="/dashboard/admin/restaurants" className="lbd-ad-back lbd-rise">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Todos los restaurantes
      </Link>

      <div className="lbd-ad-vhead lbd-rise" style={{ animationDelay: ".03s" }}>
        <span className="lbd-ad-vlogo lbd-display">{initialsOf(restaurant.name)}</span>
        <div>
          <h1 className="lbd-ph-h1">
            {restaurant.name}
            <span style={{ color: "#ff5a33" }}>.</span>
          </h1>
          <span className="lbd-ad-vmeta">
            {restaurant.owner.email} · <span className="lbd-mono">{restaurant.slug ? `/carta/${restaurant.slug}` : "sin carta publicada"}</span> · alta {dateLabel(restaurant.createdAt)}
          </span>
        </div>
        <div className="lbd-ph-actions" style={{ marginLeft: "auto" }}>
          {restaurant.slug && (
            <Link href={`/carta/${restaurant.slug}`} target="_blank" rel="noopener noreferrer" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
              Ver su carta ↗
            </Link>
          )}
        </div>
      </div>

      {(restaurant.billingStatus === "past_due" || restaurant.billingStatus === "suspended") && (
        <section className="lbd-ad-banner lbd-rise" style={{ animationDelay: ".06s" }} aria-label="Estado del cobro">
          <i className="lbd-pulse" aria-hidden />
          <div>
            <strong>{restaurant.billingStatus === "past_due" ? "Pago atrasado" : "Acceso suspendido por falta de pago"}</strong>
            <span>
              {restaurant.billingStatus === "past_due"
                ? `El cobro falló y el proveedor lo reintenta. El local sigue con acceso${restaurant.accessUntil ? ` hasta el ${dateLabel(restaurant.accessUntil)}` : " durante el plazo de gracia"}.`
                : "Pasó el plazo de gracia sin pago: no se borra nada, pero el panel del local está bloqueado hasta que pague."}
            </span>
          </div>
          <a href={`mailto:${restaurant.owner.email}`} className="lbd-btn lbd-btn--solid lbd-btn--sm">
            Escribir al dueño
          </a>
        </section>
      )}

      <div className="lbd-ad-kpis lbd-rise" style={{ animationDelay: ".09s" }}>
        {[
          { label: "Pedidos · 30 días", value: String(orders), note: orders ? `${(orders / 30).toFixed(1)} por día` : "ninguno todavía" },
          { label: "Ventas registradas", value: formatCurrency(usage._sum.total ?? 0), note: "en su panel, 30 días" },
          { label: "Usuarios", value: String(restaurant._count.staff + 1), note: `dueño y ${restaurant._count.staff} ${restaurant._count.staff === 1 ? "mozo" : "mozos"}` },
          { label: "Última actividad", value: ago(lastOrder?.createdAt ?? null), note: lastOrder ? "último pedido" : "sin pedidos" },
        ].map((kpi) => (
          <div key={kpi.label} className="lbd-card lbd-ad-kpi">
            <span>{kpi.label}</span>
            <strong className="lbd-display">{kpi.value}</strong>
            <small>{kpi.note}</small>
          </div>
        ))}
      </div>

      {categoryIsRetired && (
        <p role="status" className="lbd-modal-error">
          Este local está en la categoría <strong>{restaurant.category.name}</strong>, que ya no se ofrece. Su carta sigue funcionando; si guardas un cambio aquí tendrás que moverlo a una categoría activa.
        </p>
      )}

      <div className="lbd-ad-row" style={{ alignItems: "flex-start" }}>
        <div className="lbd-ad-main">
          <RestaurantConfigForm
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            categories={categories}
            initialCategoryId={restaurant.categoryId}
            initialTemplateOverride={restaurant.menuTemplateOverride}
            previewUrl={previewCode ? `/m/${previewCode}` : null}
          />
          <p className="lbd-bl-help" style={{ margin: 0 }}>
            Plantilla efectiva actual: <strong style={{ color: "#f3efe6" }}>{templateName(restaurant.menuTemplateOverride, restaurant.category.defaultMenuTemplate)}</strong>. Se resuelve como plantilla propia, si la tiene, y si no, la de su categoría.
          </p>
        </div>

        <div className="lbd-ad-side">
          <RestaurantAccountPanel
            id={restaurant.id}
            name={restaurant.name}
            ownerEmail={restaurant.owner.email}
            plan={restaurant.plan as PlanValue}
            staffCount={restaurant._count.staff}
            stateLabel={bill.label}
            stateColor={bill.color}
            source={SOURCE_LABEL[restaurant.billingSource] ?? restaurant.billingSource}
            nextLine={nextLine}
            nextValue={nextValue}
            since={dateLabel(restaurant.createdAt)}
            locked={locked}
          />

          <section className="lbd-card lbd-ad-panel lbd-rise" style={{ animationDelay: ".24s" }} aria-label="Historial de cambios">
            <span className="lbd-ad-h">Historial</span>
            {history.length === 0 ? (
              <p className="lbd-ad-empty" style={{ padding: "8px 0", textAlign: "left" }}>
                Nadie ha cambiado todavía la categoría ni la plantilla de este local.
              </p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="lbd-ad-act" style={{ alignItems: "flex-start" }}>
                  <i style={{ background: "#ff5a33", marginTop: 6 }} aria-hidden />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>
                      {entry.previousCategoryId ?? "—"} → {entry.newCategoryId ?? "—"}
                      <span> · plantilla {entry.previousTemplate ?? "por categoría"} → {entry.newTemplate ?? "por categoría"}</span>
                    </span>
                    <small style={{ fontSize: 11, color: "#ada599" }}>
                      {entry.performedByEmail ?? "cuenta eliminada"} · {entry.createdAt.toLocaleString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </span>
                </div>
              ))
            )}
            <small style={{ fontSize: 11, color: "#ada599" }}>
              Plan {PLAN_LABELS[restaurant.plan as PlanValue]}
              {subscription ? ` · ${formatCurrency(subscription.grossAmountCents / 100)} al mes, IGV incluido` : ""}
            </small>
          </section>
        </div>
      </div>
    </div>
  );
}
