import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import GlassCard from "@/components/ui/GlassCard";
import RestaurantConfigForm from "@/components/dashboard/admin/RestaurantConfigForm";
import { PLAN_LABELS, type PlanValue } from "@/lib/plans";

export const metadata = {
  title: "Configurar restaurante",
};

const BILLING_LABEL: Record<string, string> = {
  active: "Activo",
  pending: "Pendiente",
  cancelled: "Cancelado",
};

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

  const history = await prisma.restaurantConfigurationAudit.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const previewCode = restaurant.tables[0]?.publicCode ?? null;
  const categoryIsRetired = !categories.some(
    (category) => category.id === restaurant.categoryId
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/admin/restaurants"
          className="text-[12.5px] font-semibold text-muted transition-colors hover:text-fg"
        >
          ← Todos los restaurantes
        </Link>
        <h2 className="mt-2 font-display text-[22px] font-bold tracking-[-0.015em] text-fg">
          {restaurant.name}
        </h2>
        <p className="mt-1 text-[13px] text-faint">
          {restaurant.owner.email} · Plan {PLAN_LABELS[restaurant.plan as PlanValue]} ·{" "}
          {BILLING_LABEL[restaurant.billingStatus] ?? restaurant.billingStatus}
          {restaurant.slug ? ` · /carta/${restaurant.slug}` : " · sin carta publicada"}
        </p>
      </div>

      {categoryIsRetired && (
        <p
          role="status"
          className="rounded-xl border border-accent-400/30 bg-accent-400/[0.06] px-4 py-3 text-[13px] leading-relaxed text-fg"
        >
          Este local está en la categoría <strong>{restaurant.category.name}</strong>,
          que ya no se ofrece. Su carta sigue funcionando; si guardas un cambio aquí
          tendrás que moverlo a una categoría activa.
        </p>
      )}

      <RestaurantConfigForm
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        categories={categories}
        initialCategoryId={restaurant.categoryId}
        initialTemplateOverride={restaurant.menuTemplateOverride}
        previewUrl={previewCode ? `/m/${previewCode}` : null}
      />

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
          Historial de cambios
        </p>
        {history.length === 0 ? (
          <p className="mt-3 text-[13px] text-faint">
            Nadie ha cambiado todavía la categoría ni la plantilla de este local.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="border-l-2 border-fg/10 pl-3 text-[13px] leading-relaxed"
              >
                <p className="text-fg/85">
                  {entry.previousCategoryId ?? "—"} → {entry.newCategoryId ?? "—"}
                  <span className="text-faint">
                    {" · plantilla "}
                    {entry.previousTemplate ?? "por categoría"} →{" "}
                    {entry.newTemplate ?? "por categoría"}
                  </span>
                </p>
                <p className="text-[12px] text-faint">
                  {entry.performedByEmail ?? "cuenta eliminada"} ·{" "}
                  {entry.createdAt.toLocaleString("es-PE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <p className="text-[12.5px] leading-relaxed text-faint">
        Plantilla efectiva actual:{" "}
        <strong className="text-fg/80">
          {templateName(
            restaurant.menuTemplateOverride,
            restaurant.category.defaultMenuTemplate
          )}
        </strong>
        . Se resuelve como plantilla propia, si la tiene, y si no, la de su categoría.
      </p>
    </div>
  );
}
