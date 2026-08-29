import type { Prisma, PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "@/lib/menuMeta";

type Db = PrismaClient | Prisma.TransactionClient;

// Creates the default category set for a restaurant that has none yet. Safe to
// call more than once — it no-ops when categories already exist.
export async function seedDefaultCategories(db: Db, restaurantId: string): Promise<number> {
  const existing = await db.menuCategory.count({ where: { restaurantId } });
  if (existing > 0) return 0;

  await db.menuCategory.createMany({
    data: DEFAULT_CATEGORIES.map((name, i) => ({
      restaurantId,
      name,
      sortOrder: i,
    })),
  });
  return DEFAULT_CATEGORIES.length;
}
