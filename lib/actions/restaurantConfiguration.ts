"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Setting a restaurant's category and carta template — the FoodFlow operator's
 * job, and nobody else's.
 *
 * This module replaces `lib/actions/restaurantCategory.ts`, which let any
 * signed-in owner change their own venue's category: it was guarded by
 * `requireClientRestaurant`, which only asks "is this a tenant?", never "may
 * this tenant do this?". The category decides how a venue is presented across
 * the product, so it belongs to FoodFlow's catalogue rather than to a setting
 * the venue flips.
 *
 * THE AUDIT ROW IS NOT OPTIONAL. Unlike `logAudit`, which is best-effort by
 * design, the record here is written inside the same transaction as the
 * update. If it cannot be written the update is rolled back with it, so a
 * restaurant's identity can never move without a row saying who moved it.
 */

const TEMPLATE_KEYS = Object.keys(menuTemplates) as [string, ...string[]];

const inputSchema = z.object({
  restaurantId: z.string().cuid(),
  categoryId: z.string().trim().min(1).max(80),
  /**
   * `null` means "follow the category default" and is a real choice, not a
   * missing field — so the form sends it explicitly and the schema accepts it
   * rather than treating absence as intent.
   */
  menuTemplateOverride: z.enum(TEMPLATE_KEYS).nullable(),
});

export type RestaurantConfigurationInput = z.input<typeof inputSchema>;

export async function updateRestaurantCategoryTemplate(
  input: RestaurantConfigurationInput
): Promise<ActionResult<{ effectiveTemplate: string }>> {
  // Throws before anything is read or written if the caller is not the
  // operator. The role comes from the database, never from the request.
  const admin = await requirePermission(PERMISSIONS.MANAGE_CATEGORY_TEMPLATE);

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Los datos enviados no son válidos." };
  }
  const { restaurantId, categoryId, menuTemplateOverride } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Read the previous state inside the transaction: the audit row has to
      // describe the state this update actually replaced, not one that may
      // have changed between a read outside and the write inside.
      const before = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true,
          slug: true,
          categoryId: true,
          menuTemplateOverride: true,
          category: { select: { defaultMenuTemplate: true } },
        },
      });
      if (!before) return { kind: "not_found" as const };

      const category = await tx.restaurantCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, isActive: true, defaultMenuTemplate: true },
      });
      if (!category) return { kind: "unknown_category" as const };
      // An inactive category is retired from the catalogue: readable on the
      // venues that still carry it, never assignable to another one.
      if (!category.isActive) return { kind: "inactive_category" as const };

      // `updateMany` with the id in the filter, and exactly two columns plus
      // the carta version. Nothing else on the row is reachable from here, so
      // a field smuggled into the input has nowhere to land.
      await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          categoryId: category.id,
          menuTemplateOverride,
          // What the live carta watcher polls. Bumping it is how an open QR
          // page finds out its template changed.
          cartaVersion: { increment: 1 },
        },
      });

      await tx.restaurantConfigurationAudit.create({
        data: {
          restaurantId,
          performedByUserId: admin.id,
          performedByEmail: admin.email,
          action: "restaurant.category_template.update",
          previousCategoryId: before.categoryId,
          newCategoryId: category.id,
          previousTemplate: before.menuTemplateOverride,
          newTemplate: menuTemplateOverride,
        },
      });

      return {
        kind: "ok" as const,
        slug: before.slug,
        effectiveTemplate: resolveMenuTemplate(
          menuTemplateOverride,
          category.defaultMenuTemplate
        ),
      };
    });

    if (result.kind === "not_found") {
      return { ok: false, error: "No encontramos ese restaurante." };
    }
    if (result.kind === "unknown_category") {
      return { ok: false, error: "Esa categoría no existe." };
    }
    if (result.kind === "inactive_category") {
      return { ok: false, error: "Esa categoría ya no está disponible." };
    }

    // Drop every cached surface that renders the template. The QR pages are
    // keyed by table code, so the whole route is dropped rather than one path.
    revalidatePath("/dashboard/admin/restaurants");
    revalidatePath(`/dashboard/admin/restaurants/${restaurantId}`);
    revalidatePath("/m/[code]", "page");
    if (result.slug) revalidatePath(`/carta/${result.slug}`);

    return { ok: true, data: { effectiveTemplate: result.effectiveTemplate } };
  } catch (err) {
    console.error("[restaurant-config] update failed", err);
    return {
      ok: false,
      error: "No pudimos guardar el cambio. Inténtalo de nuevo.",
    };
  }
}
