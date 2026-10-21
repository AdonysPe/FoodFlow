import { describe, expect, test } from "vitest";
import { menuTemplates, resolveMenuTemplate } from "../lib/menuTemplates";

describe("plantillas de carta por restaurante", () => {
  test("la categoría determina la plantilla cuando no hay override", () => {
    expect(resolveMenuTemplate(null, "cevicheria")).toBe("cevicheria");
    expect(resolveMenuTemplate(null, "criolla")).toBe("criolla");
    expect(resolveMenuTemplate(null, "chifa")).toBe("chifa");
    expect(resolveMenuTemplate(null, "pizzeria")).toBe("pizzeria");
  });

  test("el override válido gana y los valores desconocidos vuelven a criolla", () => {
    expect(resolveMenuTemplate("criolla", "cevicheria")).toBe("criolla");
    expect(resolveMenuTemplate("desconocida", "cevicheria")).toBe("criolla");
    expect(resolveMenuTemplate(null, null)).toBe("criolla");
  });

  test("las cinco plantillas están registradas con una acción principal", () => {
    expect(Object.keys(menuTemplates)).toEqual(["criolla", "cevicheria", "chifa", "pizzeria", "noche"]);
    expect(menuTemplates.criolla.colors.cta).toBe("#FF6B35");
    expect(menuTemplates.cevicheria.colors.cta).toBe("#FF6B35");
    expect(menuTemplates.chifa.colors.cta).toBe("#C9362B");
    expect(menuTemplates.pizzeria.colors.cta).toBe("#E4572E");
    expect(menuTemplates.noche.colors.cta).toBe("#FF5A33");
  });

  test("noche se puede elegir como override, también sobre una categoría clásica", () => {
    expect(resolveMenuTemplate("noche", "chifa")).toBe("noche");
  });
});
