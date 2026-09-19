import TableOrderExperience from "@/components/public/TableOrderExperience";
import PhysicalCartaView from "@/components/public/PhysicalCartaView";
import RestaurantCategorySelector from "@/components/dashboard/RestaurantCategorySelector";
import { resolveMenuTemplate } from "@/lib/menuTemplates";

const DEMOS = {
  criolla: {
    venue: "Sazón de Casa",
    tagline: "Sabores criollos hechos en casa",
    categories: ["Entradas", "Platos de fondo", "Bebidas"],
    items: [
      ["Ají de gallina", "Cremoso ají amarillo, pollo y arroz blanco.", 34, "/demo/carta/aji-de-gallina.webp", 1, true],
      ["Anticuchos", "Corazón de res, papa dorada y ají casero.", 28, "/demo/carta/anticuchos.webp", 0, true],
      ["Tacu tacu", "Frejol y arroz dorados con salsa criolla.", 32, "/demo/carta/tacu-tacu.webp", 1, false],
    ],
  },
  cevicheria: {
    venue: "Costa Brava",
    tagline: "El sabor del Pacífico en cada plato",
    categories: ["Ceviches", "Tiraditos", "Platos calientes"],
    items: [
      ["Ceviche clásico", "Pesca del día, cebolla roja, camote y choclo.", 42, "/demo/carta/ceviche.webp", 0, true],
      ["Tiradito de pescado", "Láminas frescas con rocoto y limón.", 39, "/demo/carta/tiradito.webp", 1, true],
      ["Arroz con mariscos", "Arroz meloso, mariscos y ají amarillo.", 48, "/demo/carta/arroz-con-mariscos.webp", 2, false],
    ],
  },
  chifa: {
    venue: "Salón Cantón",
    tagline: "Encuentro de sabores chino-peruanos",
    categories: ["Arroces", "Piqueos", "Platos especiales"],
    items: [
      ["Arroz chaufa especial", "Arroz al wok, pollo, cerdo y cebolla china.", 32, "/demo/carta/chaufa.webp", 0, true],
      ["Kam lu wantán", "Wantanes crocantes con tamarindo y verduras.", 38, null, 2, true],
      ["Pollo tipakay", "Pollo crujiente con salsa agridulce de la casa.", 36, null, 2, false],
    ],
  },
  pizzeria: {
    venue: "Forno Barranco",
    tagline: "Horno, masa y mesa compartida",
    categories: ["Pizzas clásicas", "Pizzas especiales", "Entradas"],
    items: [
      ["Pizza margarita", "Tomate, mozzarella, albahaca y aceite de oliva.", 34, null, 0, true],
      ["Pizza pepperoni", "Mozzarella, pepperoni y salsa de tomate.", 42, null, 1, true],
      ["Pan al ajo", "Masa artesanal, ajo confitado y hierbas.", 16, null, 2, false],
    ],
  },
};

const selectorCategories = [
  ["criolla", "Restaurante criollo", "Restaurantes de comida criolla y tradicional peruana"],
  ["cevicheria", "Cevichería", "Cevicherías y restaurantes especializados en comida marina"],
  ["chifa", "Chifa", "Restaurantes de cocina chino-peruana"],
  ["pizzeria", "Pizzería", "Pizzerías artesanales, tradicionales y contemporáneas"],
].map(([id, name, description]) => ({ id, name, description, defaultMenuTemplate: id }));

export default async function PreviewCategory({ searchParams }) {
  const { mode, template: requested } = await searchParams;
  if (mode === "selector") return <div className="mx-auto max-w-4xl p-8"><RestaurantCategorySelector initialCategoryId="criolla" previewUrl={null} categories={selectorCategories} /></div>;

  const template = resolveMenuTemplate(null, requested);
  const demo = DEMOS[template];
  const categories = demo.categories.map((name, index) => ({ id: String(index), name }));
  const items = demo.items.map(([name, description, price, photoUrl, category, available], index) => ({
    id: String(index + 1), name, description, price, photoUrl, categoryId: String(category), prepMin: 12, available,
  }));
  const venue = { name: demo.venue, slug: `preview-${template}`, logoUrl: null, tagline: demo.tagline, address: "Lima, Perú", mapsUrl: null, whatsapp: null, hours: null };
  const initial = { version: 1, template, venue, categories, items };

  if (mode === "physical") return <PhysicalCartaView initial={initial} />;
  return <TableOrderExperience code="PREVIEW000" initial={{ table: { name: "Mesa 12", zone: "salon" }, restaurantName: venue.name, ...initial, openTab: null }} />;
}
