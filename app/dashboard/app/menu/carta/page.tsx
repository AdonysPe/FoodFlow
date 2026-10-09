import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import PageHeader from "@/components/dashboard/PageHeader";
import PlanGate from "@/components/dashboard/PlanGate";
import CartaSettingsForm from "@/components/dashboard/menu/CartaSettingsForm";
import { DEFAULT_HOURS, normalizeHours, slugifyVenue } from "@/lib/carta";
import { SITE_URL } from "@/lib/seo";

export const metadata = { title: "Carta pública" };

export default async function CartaSettingsPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("menu");
  if (!allowed) return <PlanGate feature="menu" plan={plan} />;
  if (!restaurant) return null;

  const [carta, visibleDishes, previewItems] = await Promise.all([
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
    // A few real dishes for the phone that previews the carta.
    prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 3,
      include: { category: { select: { name: true } } },
    }),
  ]);

  // A venue that has never opened this page gets its own name as the proposed
  // address, so the common case is "check it and save".
  const slug = restaurant.slug ?? slugifyVenue(restaurant.name);
  const live = Boolean(restaurant.slug && carta?.published);
  const publicPath = `/carta/${slug}`;

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="CARTA · CARTA PÚBLICA" title="Carta pública" description="La carta que ve tu comensal al escanear el QR. Toma los platos, precios y fotos del módulo Menú: lo que cambies allí aparece aquí al instante, sin que nadie recargue nada.">
        <Link href="/dashboard/app/menu" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
          Volver al menú
        </Link>
      </PageHeader>

      {/* Status first: an owner opening this page is usually asking one
          question, and it is "is my carta up?". */}
      <section className={`lbd-cp-banner lbd-rise${live ? " is-live" : ""}`} aria-label="Estado de la carta" style={{ animationDelay: ".04s" }}>
        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600 }}>
            <span className={live ? "lbd-pulse" : undefined} aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: live ? "#3ddc97" : "#6f675e" }} />
            {live ? "Tu carta está en línea" : "Tu carta todavía no está publicada"}
          </span>
          <span className="lbd-mono" style={{ fontSize: 13, color: "#cfc7bb", wordBreak: "break-all" }}>
            {SITE_URL.replace(/^https?:\/\//, "")}
            {publicPath}
          </span>
          {visibleDishes === 0 && <span style={{ fontSize: 13, color: "#ff9a7d" }}>Aún no tienes platos visibles. Agrega al menos uno para poder publicar.</span>}
        </div>

        {live && (
          <div className="lbd-pop" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/carta/${slug}/qr`} alt={`Código QR de la carta de ${restaurant.name}`} width={104} height={104} style={{ width: 104, height: 104, borderRadius: 12, background: "#f3efe6", padding: 8, boxSizing: "border-box" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href={publicPath} target="_blank" className="lbd-btn lbd-btn--cream lbd-btn--sm">
                Ver mi carta
              </Link>
              <a href={`/api/carta/${slug}/qr`} target="_blank" rel="noreferrer" className="lbd-btn lbd-btn--ghost lbd-btn--sm">
                Descargar QR
              </a>
            </div>
          </div>
        )}
      </section>

      <CartaSettingsForm
        siteUrl={SITE_URL}
        venueName={restaurant.name}
        previewDishes={previewItems.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.price,
          photoUrl: i.photoUrl,
          available: i.available,
          categoryName: i.category?.name ?? null,
        }))}
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
    </div>
  );
}
