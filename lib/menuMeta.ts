// Shared menu constants, DTO shapes and small helpers. No "use server" here —
// this module is imported by both server actions and client components.

// Seeded for every new restaurant, in this order. All of them stay fully
// editable and deletable afterwards.
export const DEFAULT_CATEGORIES = [
  "Entradas",
  "Principales",
  "Guarniciones",
  "Bebidas",
  "Postres",
] as const;

export type MenuCategoryDTO = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  itemCount: number;
};

export type MenuItemDTO = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  prepMin: number | null;
  available: boolean;
  sortOrder: number;
};

// A menu line as it can currently be ordered — the shape the comanda and the
// public menu consume. An item is orderable only when it's available AND its
// category is active (or it has no category).
export type OrderableItemDTO = {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  categoryName: string | null;
  prepMin: number | null;
};

export const NO_CATEGORY_LABEL = "Sin categoría";

export function itemIsOrderable(
  item: { available: boolean; categoryId: string | null },
  activeCategoryIds: Set<string>
): boolean {
  if (!item.available) return false;
  if (item.categoryId && !activeCategoryIds.has(item.categoryId)) return false;
  return true;
}
