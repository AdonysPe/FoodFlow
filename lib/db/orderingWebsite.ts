import { prisma } from "@/lib/db/prisma";
import { readCarta } from "@/lib/db/carta";
import { ENTITLEMENT_SELECT, restaurantCanUse } from "@/lib/subscriptions/access";
import { orderingAvailability, readOrderingSettings } from "@/lib/orderingWebsite";

export async function readOrderingWebsite(slug: string, preview = false) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select: {
    ...ENTITLEMENT_SELECT, carta: { select: { ordering: true, hours: true } },
  } });
  if (!restaurant || !restaurantCanUse(restaurant, "own_ordering_website")) return null;
  const settings = readOrderingSettings(restaurant.carta?.ordering);
  if (!preview && !settings.active) return null;
  const carta = await readCarta(slug, true);
  if (!carta) return null;
  return { ...carta, restaurantName: carta.venue.name, openTab: null,
    ordering: { ...settings, zones: settings.zones.filter(z => z.available) },
    availability: orderingAvailability(settings, restaurant.carta?.hours),
    venue: { ...carta.venue, hours: settings.hours ?? carta.venue.hours },
  };
}

export async function readOnlineOrder(token: string, slug: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const order = await prisma.order.findFirst({
    where: { publicToken: token, source: "online_store", restaurant: { slug } },
    select: { publicToken: true, status: true, channel: true, items: true, total: true, deliveryFee: true,
      customerName: true, fulfillmentAddress: true, deliveryZone: true, deliveryReference: true,
      customerNotes: true, paymentMethod: true, paidAt: true, voidedAt: true, estimatedMinutes: true,
      restaurant: { select: { name: true, carta: { select: { whatsapp: true } } } },
    },
  });
  if (!order) return null;
  return { code: order.publicToken!.slice(0, 10).toUpperCase(), restaurantName: order.restaurant.name,
    whatsapp: order.restaurant.carta?.whatsapp ?? null, status: order.status, channel: order.channel,
    items: order.items, total: order.total, deliveryFee: order.deliveryFee,
    customerName: order.customerName, address: order.fulfillmentAddress, zone: order.deliveryZone,
    reference: order.deliveryReference, notes: order.customerNotes, paymentMethod: order.paymentMethod,
    paid: !!order.paidAt, voided: !!order.voidedAt, estimatedMinutes: order.estimatedMinutes,
  };
}
