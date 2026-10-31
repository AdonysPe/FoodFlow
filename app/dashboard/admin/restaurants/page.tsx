import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import RestaurantsTable from "@/components/dashboard/RestaurantsTable";
import CreateRestaurantForm from "@/components/dashboard/CreateRestaurantForm";
import PageHeader from "@/components/dashboard/PageHeader";
import RestaurantFilters from "@/components/dashboard/admin/RestaurantFilters";
import { PLANS, PLAN_PRICES, type PlanValue } from "@/lib/plans";

export const metadata = {
  title: "Administración de restaurantes",
};

const PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // The layout above already redirects a non-admin. This second, throwing check
  // is deliberate: a page must not depend on a parent layout for its
  // authorization, and the two together mean adding a route under
  // /dashboard/admin can never accidentally ship unguarded.
  await requirePermission(PERMISSIONS.VIEW_ALL_RESTAURANTS);

  const params = await searchParams;
  const query = readParam(params, "q");
  const categoryFilter = readParam(params, "categoria");
  const templateFilter = readParam(params, "plantilla");
  const planFilter = readParam(params, "plan");
  const billFilter = readParam(params, "cobro");
  const page = Math.max(1, Number(readParam(params, "page")) || 1);

  // Every active filter is one entry in an AND list. Building it this way
  // rather than spreading objects matters: the name search and the template
  // filter each need their own `OR`, and two `OR` keys in one object would
  // silently overwrite each other — the search would quietly stop applying.
  const clauses: Prisma.RestaurantWhereInput[] = [];

  if (query) {
    clauses.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { owner: { email: { contains: query, mode: "insensitive" } } },
      ],
    });
  }

  if (categoryFilter) clauses.push({ categoryId: categoryFilter });
  if ((PLANS as readonly string[]).includes(planFilter)) clauses.push({ plan: planFilter as PlanValue });
  if (["active", "trialing", "past_due"].includes(billFilter)) clauses.push({ billingStatus: billFilter as "active" | "trialing" | "past_due" });

  // "Effective template" is `menuTemplateOverride ?? the category default`, so
  // matching it takes both halves of that fallback: a venue counts as pizzería
  // either because it was overridden to one, or because its category hands it
  // one and nothing overrode it.
  if (templateFilter) {
    clauses.push({
      OR: [
        { menuTemplateOverride: templateFilter },
        {
          menuTemplateOverride: null,
          category: { defaultMenuTemplate: templateFilter },
        },
      ],
    });
  }

  const scoped: Prisma.RestaurantWhereInput = clauses.length ? { AND: clauses } : {};

  const [categories, totalCount, matchCount, restaurants, planCounts] = await Promise.all([
    prisma.restaurantCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: scoped }),
    prisma.restaurant.findMany({
      where: scoped,
      include: {
        owner: { select: { email: true } },
        category: { select: { id: true, name: true, defaultMenuTemplate: true } },
        _count: { select: { staff: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.restaurant.groupBy({ by: ["plan"], _count: { _all: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));

  const rows = restaurants.map((restaurant) => {
    const effective = resolveMenuTemplate(
      restaurant.menuTemplateOverride,
      restaurant.category.defaultMenuTemplate
    );
    return {
      id: restaurant.id,
      name: restaurant.name,
      ownerEmail: restaurant.owner.email,
      plan: restaurant.plan as PlanValue,
      staffCount: restaurant._count.staff,
      categoryName: restaurant.category.name,
      templateLabel: menuTemplates[effective].name,
      /** True when the venue follows its category instead of an override. */
      templateIsDefault: restaurant.menuTemplateOverride === null,
      billingStatus: restaurant.billingStatus,
      slug: restaurant.slug,
      createdAtLabel: restaurant.createdAt.toLocaleDateString("es-PE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  });

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (categoryFilter) next.set("categoria", categoryFilter);
    if (templateFilter) next.set("plantilla", templateFilter);
    if (planFilter) next.set("plan", planFilter);
    if (billFilter) next.set("cobro", billFilter);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `/dashboard/admin/restaurants?${qs}` : "/dashboard/admin/restaurants";
  }

  const planCount = (plan: PlanValue) => planCounts.find((row) => row.plan === plan)?._count._all ?? 0;
  const stats = [
    { label: "Locales", value: totalCount, note: "en la plataforma", color: "#c5bdb1" },
    ...PLANS.map((plan) => ({
      label: plan === "carta" ? "Carta" : plan === "servicio" ? "Servicio" : "Negocio",
      value: planCount(plan),
      note: `${PLAN_PRICES[plan]} al mes, IGV incluido`,
      color: plan === "negocio" ? "#ff5a33" : plan === "servicio" ? "#f3efe6" : "#9a9287",
    })),
  ];

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="CLIENTES · RESTAURANTES" title="Restaurantes" description="Todos los locales de la plataforma: su plan, cómo van con el cobro y con qué plantilla se ve su carta.">
        <CreateRestaurantForm />
      </PageHeader>

      <div className="lbd-ad-kpis lbd-rise" style={{ animationDelay: ".04s" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="lbd-card lbd-ad-kpi">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <i style={{ width: 8, height: 8, borderRadius: "50%", background: stat.color }} aria-hidden />
              {stat.label}
            </span>
            <strong className="lbd-display">{stat.value}</strong>
            <small>{stat.note}</small>
          </div>
        ))}
      </div>

      <RestaurantFilters
        categories={categories.map((category) => ({
          value: category.id,
          label: category.isActive ? category.name : `${category.name} (inactiva)`,
        }))}
        templates={Object.values(menuTemplates).map((template) => ({
          value: template.id,
          label: template.name,
        }))}
        resultCount={matchCount}
        totalCount={totalCount}
      />

      {rows.length === 0 ? (
        <div className="lbd-empty">{totalCount === 0 ? "Todavía no hay restaurantes. Crea el primero con «Nuevo restaurante»." : "Ningún restaurante coincide con esa búsqueda. Prueba con otro nombre o limpia los filtros."}</div>
      ) : (
        <RestaurantsTable restaurants={rows} />
      )}

      {pageCount > 1 && (
        <nav aria-label="Paginación de restaurantes" className="lbd-ad-pager">
          <p>
            Página {page} de {pageCount} · {matchCount} restaurantes
          </p>
          <div>
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
                ← Anterior
              </Link>
            )}
            {page < pageCount && (
              <Link href={pageHref(page + 1)} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
                Siguiente →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
