import TableOrderExperience from "@/components/public/TableOrderExperience";
import PhysicalCartaView from "@/components/public/PhysicalCartaView";
import RestaurantCategorySelector from "@/components/dashboard/RestaurantCategorySelector";

const categories = ["Ceviches", "Tiraditos", "Platos calientes", "Bebidas", "Postres"].map((name, index) => ({ id: String(index), name }));
const items = [
  { id: "1", name: "Ceviche clásico", description: "Pesca del día, cebolla roja, camote y choclo.", price: 42, photoUrl: "/demo/carta/ceviche.webp", categoryId: "0", prepMin: 12, available: true },
  { id: "2", name: "Tiradito de pescado", description: "Láminas frescas con rocoto y limón.", price: 39, photoUrl: "/demo/carta/tiradito.webp", categoryId: "1", prepMin: 12, available: true },
  { id: "3", name: "Leche de tigre", description: "Cítricos, culantro y cancha.", price: 28, photoUrl: null, categoryId: "0", prepMin: 8, available: false },
  { id: "4", name: "Arroz con mariscos", description: "Arroz meloso, mariscos y ají amarillo.", price: 48, photoUrl: "/demo/carta/arroz-con-mariscos.webp", categoryId: "2", prepMin: 20, available: true },
];
const venue = { name: "Costa Brava", slug: "preview", logoUrl: null, tagline: "El sabor del Pacífico en cada plato", address: "Miraflores, Lima", mapsUrl: null, whatsapp: null, hours: null };

export default async function PreviewCategory({ searchParams }) {
  const { mode } = await searchParams;
  if (mode === "selector") return <div className="mx-auto max-w-4xl p-8"><RestaurantCategorySelector initialCategoryId="criolla" previewUrl={null} categories={[
    { id: "criolla", name: "Restaurante criollo", description: "Restaurantes de comida criolla y tradicional peruana", defaultMenuTemplate: "criolla" },
    { id: "cevicheria", name: "Cevichería", description: "Cevicherías y restaurantes especializados en comida marina", defaultMenuTemplate: "cevicheria" },
  ]} /></div>;
  if (mode === "physical") return <PhysicalCartaView initial={{ version: 1, template: "cevicheria", venue, categories, items }} />;
  return <TableOrderExperience code="PREVIEW000" initial={{ table: { name: "Mesa 12", zone: "salon" }, restaurantName: venue.name, venue, template: "cevicheria", categories, items, openTab: null }} />;
}
