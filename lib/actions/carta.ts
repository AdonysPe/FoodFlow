"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { OwnerWritableRestaurantData } from "@/lib/auth/restaurantFields";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import { bumpCarta } from "@/lib/db/carta";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/carta";
import type { ActionResult } from "@/lib/actions/auth";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalHttps = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v == null || /^https:\/\/\S+$/.test(v), {
      message: "El enlace debe empezar con https://",
    });

const dayHoursSchema = z.object({
  day: z.coerce.number().int().min(0).max(6),
  closed: z.coerce.boolean(),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida (usa 18:30)"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida (usa 23:00)"),
});

const cartaSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => SLUG_PATTERN.test(v), {
      message: "Usa solo minúsculas, números y guiones (sin espacios ni tildes).",
    })
    .refine((v) => !RESERVED_SLUGS.has(v), { message: "Esa dirección está reservada." }),
  published: z.coerce.boolean(),
  tagline: optionalText(120),
  address: optionalText(160),
  logoUrl: optionalHttps(500),
  mapsUrl: optionalHttps(500),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : ""))
    .transform((v) => (v.length > 0 ? v : null))
    .refine((v) => v == null || /^9\d{8}$/.test(v), {
      message: "El WhatsApp debe tener 9 dígitos y empezar en 9.",
    }),
  hours: z.array(dayHoursSchema).length(7, "Faltan días en el horario."),
});

export type CartaSettingsInput = z.input<typeof cartaSchema>;

export async function saveCartaSettings(
  input: CartaSettingsInput
): Promise<ActionResult<{ slug: string }>> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };

  const parsed = cartaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { slug, ...carta } = parsed.data;
  if (restaurant.slug && restaurant.slug !== slug) {
    const existing = await prisma.cartaSettings.findUnique({ where: { restaurantId: restaurant.id }, select: { ordering: true } });
    if (existing?.ordering) return { ok: false, error: "La dirección ya está vinculada a tu web de pedidos y debe mantenerse estable." };
  }

  // A published carta with no dishes is a dead link handed to real diners.
  if (carta.published) {
    const dishes = await prisma.menuItem.count({
      where: {
        restaurantId: restaurant.id,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
    });
    if (dishes === 0) {
      return {
        ok: false,
        error: "Agrega al menos un plato visible antes de publicar tu carta.",
      };
    }
  }

  // Typed as owner-writable so the build rejects this update the day someone
  // adds `categoryId`, `menuTemplateOverride`, `plan` or `billingStatus` to it:
  // those belong to FoodFlow, and this is an owner-reachable path.
  const ownerWritable: OwnerWritableRestaurantData = {
    // Bumped here rather than through bumpCarta so the address change and the
    // version move land in the same transaction as everything else.
    slug,
    cartaVersion: { increment: 1 },
  };

  try {
    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: restaurant.id },
        data: ownerWritable,
      }),
      prisma.cartaSettings.upsert({
        where: { restaurantId: restaurant.id },
        create: { restaurantId: restaurant.id, ...carta },
        update: carta,
      }),
    ]);
  } catch (err) {
    if (typeof err === "object" && err && (err as { code?: string }).code === "P2002") {
      return { ok: false, error: `La dirección "${slug}" ya la está usando otro restaurante.` };
    }
    throw err;
  }

  revalidatePath("/dashboard/app/menu/carta");
  revalidatePath(`/carta/${slug}`);
  return { ok: true, data: { slug } };
}

/**
 * Take the carta offline without touching anything else.
 *
 * Separate from the settings form because an owner reaching for this is
 * usually in a hurry — a wrong price is live and they want it gone now.
 */
export async function setCartaPublished(published: boolean): Promise<ActionResult> {
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return { ok: false, error: "Tu cuenta no está vinculada a un restaurante." };
  if (!restaurant.slug) {
    return { ok: false, error: "Primero elige la dirección de tu carta." };
  }

  await prisma.cartaSettings.upsert({
    where: { restaurantId: restaurant.id },
    create: { restaurantId: restaurant.id, published },
    update: { published },
  });
  await bumpCarta(restaurant.id);

  revalidatePath("/dashboard/app/menu/carta");
  revalidatePath(`/carta/${restaurant.slug}`);
  return { ok: true, data: undefined };
}
