import { describe, expect, it } from "vitest";
import { PLAN_PRICES, planAllows } from "./plans";

describe("planes", () => {
  it("mantiene los precios publicados", () => {
    expect(PLAN_PRICES).toEqual({
      carta: "S/ 79",
      servicio: "S/ 179",
      negocio: "S/ 349",
    });
  });

  it("mantiene análisis limitado al plan Negocio", () => {
    expect(planAllows("carta", "analytics")).toBe(false);
    expect(planAllows("servicio", "analytics")).toBe(false);
    expect(planAllows("negocio", "analytics")).toBe(true);
  });
});
