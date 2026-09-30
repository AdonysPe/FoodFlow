import { describe, expect, it } from "vitest";
import { PLAN_MONTHLY_NET_CENTS, PLAN_PRICES, PLANS, planAllows } from "./plans";
import { dictionaries } from "./i18n/dictionaries";

describe("planes", () => {
  it("mantiene los precios publicados", () => {
    expect(PLAN_MONTHLY_NET_CENTS).toEqual({ carta: 6900, servicio: 16900, negocio: 33900 });
    expect(PLAN_PRICES).toEqual({
      carta: "S/ 69",
      servicio: "S/ 169",
      negocio: "S/ 339",
    });
  });

  // The public site writes its prices as text in the dictionary. If the
  // catalogue the checkout charges from moves, the page has to move with it.
  it("la web pública muestra los mismos precios que cobra el checkout", () => {
    for (const lang of ["es", "en"] as const) {
      const items = dictionaries[lang].chat.plans.items as { price: string }[];
      expect(items.map((item) => item.price)).toEqual(PLANS.map((plan) => PLAN_PRICES[plan]));
    }
  });

  it("mantiene análisis limitado al plan Negocio", () => {
    expect(planAllows("carta", "analytics")).toBe(false);
    expect(planAllows("servicio", "analytics")).toBe(false);
    expect(planAllows("negocio", "analytics")).toBe(true);
  });
});
