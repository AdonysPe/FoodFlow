export const criollaTheme = {
  id: "criolla",
  name: "Restaurante criollo",
  description: "Estilo cálido y tradicional para restaurantes de comida criolla peruana.",
  subtitle: "Sabores criollos hechos en casa",
  colors: { background: "#F5EDDF", surface: "#FFFAF0", primary: "#742E27", secondary: "#A04C35", accent: "#526A43", cta: "#FF6B35" },
  decoration: "aji",
} as const;

export const cevicheriaTheme = {
  id: "cevicheria",
  name: "Cevichería",
  description: "Estilo fresco inspirado en el litoral peruano, ideal para cevicherías y restaurantes marinos.",
  subtitle: "Frescura del Pacífico, hecha en casa",
  colors: { background: "#FFF9ED", surface: "#FFFFFF", primary: "#123B4A", secondary: "#168AAD", accent: "#52B8B0", cta: "#FF6B35" },
  decoration: "pacifico",
} as const;

export const chifaTheme = {
  id: "chifa",
  name: "Chifa",
  description: "Identidad elegante chino-peruana, con granate, dorado envejecido y acentos jade.",
  subtitle: "Encuentro de sabores chino-peruanos",
  colors: { background: "#FFF7E8", surface: "#FFFFFF", primary: "#7A1F1F", secondary: "#B83227", accent: "#D6A43B", cta: "#C9362B" },
  decoration: "celosia",
} as const;

export const pizzeriaTheme = {
  id: "pizzeria",
  name: "Pizzería",
  description: "Estilo artesanal urbano, cálido y familiar para pizzerías tradicionales y contemporáneas.",
  subtitle: "Horno, masa y mesa compartida",
  colors: { background: "#F8F1E5", surface: "#FFFDF8", primary: "#8F2D24", secondary: "#C94C32", accent: "#3F6B3A", cta: "#E4572E" },
  decoration: "trigo",
} as const;

/** Restaurant identity, separate from the categories inside its menu. */
export const menuTemplates = {
  criolla: criollaTheme,
  cevicheria: cevicheriaTheme,
  chifa: chifaTheme,
  pizzeria: pizzeriaTheme,
} as const;

export type MenuTemplateKey = keyof typeof menuTemplates;

export function resolveMenuTemplate(override?: string | null, categoryDefault?: string | null): MenuTemplateKey {
  const candidate = override ?? categoryDefault;
  return candidate && Object.hasOwn(menuTemplates, candidate)
    ? candidate as MenuTemplateKey
    : "criolla";
}
