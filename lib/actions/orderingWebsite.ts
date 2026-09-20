"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { planAllows } from "@/lib/plans";
import { slugifyVenue } from "@/lib/carta";
import { OrderingProblem, orderingSettingsSchema, readOrderingSettings, type OrderingSettings } from "@/lib/orderingWebsite";
import type { ActionResult } from "@/lib/actions/auth";

async function writeSettings(input: unknown, statusOnly = false): Promise<ActionResult<{ slug: string }>> {
  const { user, restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant || !isOwner) return { ok: false, error: "Solo el dueño puede configurar esta web." };
  try {
    const slug = await prisma.$transaction(async tx => {
      const current = await tx.restaurant.findFirst({ where: { id: restaurant.id, ownerId: user.id }, include: { carta: true } });
      if (!current || !planAllows(current.plan, "own_ordering_website")) throw new OrderingProblem("Tu plan no incluye Web de pedidos.");
      const previous = readOrderingSettings(current.carta?.ordering);
      const settings = orderingSettingsSchema.safeParse(statusOnly ? { ...previous, active: true, paused: input, accepting: input === false ? true : previous.accepting } : input);
      if (!settings.success) throw new OrderingProblem(settings.error.issues[0]?.message ?? "Revisa la configuración.");
      if (settings.data.active) {
        if (!current.carta?.address || !(settings.data.hours || current.carta.hours)) throw new OrderingProblem("Configura la dirección y los horarios en Carta pública antes de activar pedidos.");
        const count = await tx.menuItem.count({ where: { restaurantId: current.id, available: true, OR: [{ categoryId: null }, { category: { active: true } }] } });
        if (!count) throw new OrderingProblem("Agrega al menos un plato disponible al menú.");
      }
      const slug = current.slug ?? `${slugifyVenue(current.name).slice(0, 30) || "restaurante"}-${randomBytes(4).toString("hex")}`;
      await tx.restaurant.update({ where: { id: current.id }, data: { slug, cartaVersion: { increment: 1 } } });
      await tx.cartaSettings.upsert({ where: { restaurantId: current.id }, create: { restaurantId: current.id, ordering: settings.data }, update: { ordering: settings.data } });
      return slug;
    }, { isolationLevel: "Serializable" });
    revalidatePath("/dashboard/app/web-pedidos");
    revalidatePath(`/pedido/${slug}`);
    return { ok: true, data: { slug } };
  } catch (error) {
    return { ok: false, error: error instanceof OrderingProblem ? error.message : "No se pudo guardar. Vuelve a intentarlo." };
  }
}
export async function saveOrderingWebsite(input: OrderingSettings) { return writeSettings(input); }
export async function setOrderingPaused(paused: boolean) {
  if (typeof paused !== "boolean") return { ok: false as const, error: "Estado no válido." };
  return writeSettings(paused, true);
}
