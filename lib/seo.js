/**
 * The handful of strings every SEO surface needs to agree on: the canonical
 * origin, and the one-line description that has to read the same in the meta
 * tag, in the Open Graph card and in the Organization markup. Kept here so a
 * change lands in all three at once instead of drifting between them.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodflow.site";

export const SITE_NAME = "FoodFlow";

export const SITE_TITLE = "FoodFlow — Tu restaurante funcionando en 48 horas";

export const SITE_DESCRIPTION =
  "Programa piloto en Lima: montamos tu carta, tus canales de pedido, la pantalla de cocina y tus números en un solo panel. Primer mes gratis.";

export const SOCIAL_DESCRIPTION =
  "Pedidos, cocina, carta y números en un solo panel. Programa piloto en Lima con plazas limitadas.";
