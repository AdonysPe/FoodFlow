import { prisma } from "@/lib/db/prisma";
import { normalizeHours, type CartaPayload } from "@/lib/carta";

/**
 * Everything the public carta shows, for one slug.
 *
 * Sold-out dishes are fetched too, not filtered out: the diner is told the
 * dish exists and is finished today, which is the whole point of the "Agotado"
 * badge. Hidden categories and their dishes are excluded, because a hidden
 * category is the owner saying "not on the menu right now".
 */
export async function readCarta(slug: string): Promise<CartaPayload | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      cartaVersion: true,
      carta: {
        select: {
          published: true,
          logoUrl: true,
          tagline: true,
          address: true,
          mapsUrl: true,
          whatsapp: true,
          hours: true,
        },
      },
    },
  });

  if (!restaurant?.slug || !restaurant.carta?.published) return null;

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        photoUrl: true,
        categoryId: true,
        available: true,
      },
    }),
  ]);

  return {
    version: restaurant.cartaVersion,
    venue: {
      name: restaurant.name,
      slug: restaurant.slug,
      tagline: restaurant.carta.tagline,
      logoUrl: restaurant.carta.logoUrl,
      address: restaurant.carta.address,
      mapsUrl: restaurant.carta.mapsUrl,
      whatsapp: restaurant.carta.whatsapp,
      hours: normalizeHours(restaurant.carta.hours),
    },
    categories,
    items,
  };
}

/**
 * The one indexed read the live-update watcher runs on its tick.
 *
 * Returns null for a slug that does not exist or whose carta is unpublished,
 * so a stream opened against it closes instead of polling forever.
 */
export async function readCartaVersion(slug: string): Promise<number | null> {
  const row = await prisma.restaurant.findUnique({
    where: { slug },
    select: { cartaVersion: true, carta: { select: { published: true } } },
  });
  if (!row?.carta?.published) return null;
  return row.cartaVersion;
}

/**
 * Marks this venue's carta as changed.
 *
 * Called by every write that alters what a diner sees — a price, a name, a
 * photo, availability, the order of things, a category, the header. It is a
 * single UPDATE on a row that always exists, so it cannot fail the way an
 * upsert on a missing settings row could, and it never blocks the write it
 * follows: a bump that throws would be a worse outcome than a carta that
 * refreshes on the 30-second fallback instead of instantly.
 */
export async function bumpCarta(restaurantId: string): Promise<void> {
  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { cartaVersion: { increment: 1 } },
    });
  } catch (err) {
    console.error("No se pudo marcar la carta como cambiada:", err);
  }
}
