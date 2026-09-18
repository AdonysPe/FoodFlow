/** Restaurant identity, separate from the categories inside its menu. */
export const menuTemplates = {
  criolla: {
    id: "criolla",
    name: "Restaurante criollo",
    description: "Estilo cálido y tradicional para restaurantes de comida criolla peruana.",
    subtitle: "Sabores criollos hechos en casa",
    colors: { background: "#F5EDDF", surface: "#FFFAF0", primary: "#742E27", secondary: "#A04C35", cta: "#FF6B35" },
    decoration: "aji",
  },
  cevicheria: {
    id: "cevicheria",
    name: "Cevichería",
    description: "Estilo fresco inspirado en el litoral peruano, ideal para cevicherías y restaurantes marinos.",
    subtitle: "Frescura del Pacífico, hecha en casa",
    colors: { background: "#FFF9ED", surface: "#FFFFFF", primary: "#123B4A", secondary: "#168AAD", cta: "#FF6B35" },
    decoration: "pacifico",
  },
} as const;

export type MenuTemplateKey = keyof typeof menuTemplates;

export function resolveMenuTemplate(override?: string | null, categoryDefault?: string | null): MenuTemplateKey {
  const candidate = override ?? categoryDefault;
  return candidate && Object.hasOwn(menuTemplates, candidate)
    ? candidate as MenuTemplateKey
    : "criolla";
}
