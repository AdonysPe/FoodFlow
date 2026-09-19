import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import RestaurantsTable from "@/components/dashboard/RestaurantsTable";
import CreateRestaurantForm from "@/components/dashboard/CreateRestaurantForm";
import RestaurantFilters from "@/components/dashboard/admin/RestaurantFilters";
import type { PlanValue } from "@/lib/plans";

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

  const [categories, totalCount, matchCount, restaurants] = await Promise.all([
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
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `/dashboard/admin/restaurants?${qs}` : "/dashboard/admin/restaurants";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">
          Administración de restaurantes
        </h2>
        <p className="mt-1 text-[13px] text-faint">
          Todos los locales de la plataforma: su plan, su categoría y la plantilla
          con la que se ve su carta.
        </p>
      </div>

      <CreateRestaurantForm />

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
        <div className="rounded-xl border border-dashed border-fg/15 bg-fg/[0.02] px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-fg">
            {totalCount === 0
              ? "Todavía no hay restaurantes."
              : "Ningún restaurante coincide con esa búsqueda."}
          </p>
          <p className="mt-1.5 text-[13px] text-faint">
            {totalCount === 0
              ? "Crea el primero con el formulario de arriba."
              : "Prueba con otro nombre, o limpia los filtros para verlos todos."}
          </p>
        </div>
      ) : (
        <RestaurantsTable restaurants={rows} />
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Paginación de restaurantes"
          className="flex items-center justify-between gap-4"
        >
          <p className="text-[12.5px] tabular-nums text-faint">
            Página {page} de {pageCount} · {matchCount} restaurantes
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-fg/15 px-3 py-2 text-[12.5px] font-semibold text-fg transition-colors hover:bg-fg/[0.06]"
              >
                ← Anterior
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-fg/15 px-3 py-2 text-[12.5px] font-semibold text-fg transition-colors hover:bg-fg/[0.06]"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
