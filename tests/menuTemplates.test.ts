import { describe, expect, test } from "vitest";
import { menuTemplates, resolveMenuTemplate } from "../lib/menuTemplates";

describe("plantillas de carta por restaurante", () => {
  test("la categoría determina la plantilla cuando no hay override", () => {
    expect(resolveMenuTemplate(null, "cevicheria")).toBe("cevicheria");
    expect(resolveMenuTemplate(null, "criolla")).toBe("criolla");
  });

  test("el override válido gana y los valores desconocidos vuelven a criolla", () => {
    expect(resolveMenuTemplate("criolla", "cevicheria")).toBe("criolla");
    expect(resolveMenuTemplate("desconocida", "cevicheria")).toBe("criolla");
    expect(resolveMenuTemplate(null, null)).toBe("criolla");
  });

  test("ambas plantillas conservan la misma acción principal", () => {
    expect(menuTemplates.criolla.colors.cta).toBe("#FF6B35");
    expect(menuTemplates.cevicheria.colors.cta).toBe("#FF6B35");
  });
});
