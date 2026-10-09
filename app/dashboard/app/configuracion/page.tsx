import Link from "next/link";
import ExportDataButton from "@/components/dashboard/ExportDataButton";
import PageHeader from "@/components/dashboard/PageHeader";
import SubscriptionCheckoutPanel from "@/components/dashboard/SubscriptionCheckoutPanel";
import RestaurantNameCard from "@/components/dashboard/RestaurantNameCard";
import { requireClientRestaurant } from "@/lib/auth/restaurant";

export const metadata = {
  title: "Configuración",
};

const SETTINGS = [
  {
    href: "/dashboard/app/menu/carta",
    title: "Carta pública",
    description: "Dominio, WhatsApp, horarios y publicación de tu carta.",
  },
  {
    href: "/dashboard/app/equipo",
    title: "Equipo",
    description: "Accesos de mozos y usuarios del restaurante.",
  },
  {
    href: "/dashboard/app/configuracion/facturacion",
    title: "Facturación electrónica",
    description: "SUNAT, OSE, comprobantes y configuración de ticketera.",
  },
] as const;

export default async function SettingsPage() {
  const { restaurant, isOwner } = await requireClientRestaurant();
  if (!restaurant) return null;

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="CONFIGURACIÓN · CUENTA" title={`Configuración de ${restaurant.name}`} description="Cuenta, suscripción, datos y conexiones del local activo." />

      {/* Keyed by venue: switching restaurants must not carry a half-typed name over. */}
      <RestaurantNameCard key={restaurant.id} currentName={restaurant.name} canEdit={isOwner} />

      <section className="lbd-card lbd-card--glass lbd-rise lbd-cf-card" style={{ animationDelay: ".1s" }}>
        <SubscriptionCheckoutPanel restaurantId={restaurant.id} restaurantName={restaurant.name} />
      </section>

      <section className="lbd-card lbd-rise lbd-cf-card lbd-cf-export" style={{ animationDelay: ".14s" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span className="lbd-cm-eyebrow">Tus datos</span>
          <h2 className="lbd-cf-h">Exportación</h2>
          <p className="lbd-cf-p">Descarga el menú completo y los últimos 100 pedidos del local activo en CSV.</p>
        </div>
        <ExportDataButton />
      </section>

      <div className="lbd-cf-links lbd-rise" style={{ animationDelay: ".18s" }}>
        {SETTINGS.map((setting) => (
          <Link key={setting.href} href={setting.href} className="lbd-card lbd-cf-link">
            <span className="lbd-cf-link-t">{setting.title}</span>
            <span className="lbd-cf-link-d">{setting.description}</span>
            <span className="lbd-cf-link-go" aria-hidden>
              Abrir ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
