import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PlanGate from "@/components/dashboard/PlanGate";
import CartaSettingsForm from "@/components/dashboard/menu/CartaSettingsForm";
import { DEFAULT_HOURS, normalizeHours, slugifyVenue } from "@/lib/carta";
import { SITE_URL } from "@/lib/seo";

export const metadata = { title: "Carta pública" };

export default async function CartaSettingsPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("menu");
  if (!allowed) return <PlanGate feature="menu" plan={plan} />;
  if (!restaurant) return null;

  const [carta, visibleDishes] = await Promise.all([
    prisma.cartaSettings.findUnique({
      where: { restaurantId: restaurant.id },
      select: {
        published: true,
        tagline: true,
        address: true,
        logoUrl: true,
        mapsUrl: true,
        whatsapp: true,
        hours: true,
      },
    }),
    prisma.menuItem.count({
      where: {
        restaurantId: restaurant.id,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
    }),
  ]);

  // A venue that has never opened this page gets its own name as the proposed
  // address, so the common case is "check it and save".
  const slug = restaurant.slug ?? slugifyVenue(restaurant.name);
  const live = Boolean(restaurant.slug && carta?.published);
  const publicPath = `/carta/${slug}`;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">
            Carta pública
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-faint">
            La carta que ve tu comensal al escanear el QR. Toma los platos, precios y
            fotos del módulo Menú: lo que cambies allí aparece aquí al instante, sin que
            nadie recargue nada.
          </p>
        </div>
        <Link
          href="/dashboard/app/menu"
          className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-2 text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
        >
          Volver al menú
        </Link>
      </div>

      {/* Status first: an owner opening this page is usually asking one
          question, and it is "is my carta up?". */}
      <div
        className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border p-5 ${
          live
            ? "border-mint/25 bg-mint/[0.06]"
            : "border-fg/[0.08] bg-fg/[0.02]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
            <span
              className={`h-2 w-2 rounded-full ${live ? "bg-mint" : "bg-fg/30"}`}
              aria-hidden
            />
            {live ? "Tu carta está en línea" : "Tu carta todavía no está publicada"}
          </p>
          <p className="mt-1 break-all font-mono text-[12.5px] text-muted">
            {SITE_URL.replace(/^https?:\/\//, "")}
            {publicPath}
          </p>
          {visibleDishes === 0 && (
            <p className="mt-2 text-[12.5px] text-accent-ink">
              Aún no tienes platos visibles. Agrega al menos uno para poder publicar.
            </p>
          )}
        </div>

        {live && (
          <div className="flex items-center gap-4">
            <img
              src={`/api/carta/${slug}/qr`}
              alt={`Código QR de la carta de ${restaurant.name}`}
              width={104}
              height={104}
              className="h-[104px] w-[104px] rounded-lg bg-white p-1.5"
            />
            <div className="flex flex-col gap-2">
              <Link
                href={publicPath}
                target="_blank"
                className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3.5 py-2 text-center text-[13px] font-semibold text-on-accent hover:opacity-90"
              >
                Ver mi carta
              </Link>
              <a
                href={`/api/carta/${slug}/qr`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3.5 py-2 text-center text-[13px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
              >
                Descargar QR
              </a>
            </div>
          </div>
        )}
      </div>

      <CartaSettingsForm
        siteUrl={SITE_URL}
        initial={{
          slug,
          published: carta?.published ?? false,
          tagline: carta?.tagline ?? "",
          address: carta?.address ?? "",
          logoUrl: carta?.logoUrl ?? "",
          mapsUrl: carta?.mapsUrl ?? "",
          whatsapp: carta?.whatsapp ?? "",
          hours: carta?.hours ? normalizeHours(carta.hours) : DEFAULT_HOURS,
        }}
      />

      <section className="rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
        <h3 className="text-[14px] font-semibold text-fg">Cómo se actualiza</h3>
        <ul className="mt-3 flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-muted">
          <li>
            <span className="font-medium text-fg/75">Al instante.</span> Cambias un precio
            o marcas un plato como agotado en Menú y el teléfono del comensal se actualiza
            solo, sin recargar, en un par de segundos.
          </li>
          <li>
            <span className="font-medium text-fg/75">Aunque falle la conexión.</span> Si el
            wifi del local se cae, la carta sigue consultando cada 30 segundos; y si el
            comensal se queda sin datos, ve la última versión que cargó.
          </li>
          <li>
            <span className="font-medium text-fg/75">Los agotados no desaparecen.</span> Se
            muestran en gris con la etiqueta “Agotado”, para que el comensal sepa que el
            plato existe y no te lo pida.
          </li>
        </ul>
      </section>
    </div>
  );
}
