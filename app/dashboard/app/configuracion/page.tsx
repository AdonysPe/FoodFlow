import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import BillingStatusBadge from "@/components/dashboard/BillingStatusBadge";
import ExportDataButton from "@/components/dashboard/ExportDataButton";
import SubscriptionCheckoutPanel from "@/components/dashboard/SubscriptionCheckoutPanel";
import { requireClientRestaurant } from "@/lib/auth/restaurant";
import {
  PLAN_LABELS,
  PLAN_PRICES,
  type PlanValue,
} from "@/lib/plans";

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
  const { restaurant } = await requireClientRestaurant();
  if (!restaurant) return null;

  const plan = restaurant.plan as PlanValue;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[19px] font-bold tracking-[-0.01em] text-fg">
          Configuración de {restaurant.name}
        </h2>
        <p className="mt-1 text-[13px] text-faint">
          Cuenta, suscripción, datos y conexiones del local activo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                Plan y cobro
              </p>
              <h3 className="mt-2 font-display text-[20px] font-bold text-fg">
                Plan {PLAN_LABELS[plan]}
              </h3>
              <p className="mt-1 text-[13px] text-muted">{PLAN_PRICES[plan]}/mes</p>
            </div>
            <BillingStatusBadge status={restaurant.billingStatus} />
          </div>
          <SubscriptionCheckoutPanel restaurantId={restaurant.id} restaurantName={restaurant.name} />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
            Tus datos
          </p>
          <h3 className="mt-2 font-display text-[20px] font-bold text-fg">
            Exportación
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-faint">
            Descarga el menú completo y los últimos 100 pedidos del local activo en CSV.
          </p>
          <ExportDataButton className="mt-5" />
        </GlassCard>
      </div>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
          Configuración operativa
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SETTINGS.map((setting) => (
            <Link
              key={setting.href}
              href={setting.href}
              className="rounded-xl border border-fg/[0.09] bg-fg/[0.025] p-4 transition-colors hover:bg-fg/[0.06]"
            >
              <span className="block text-[14px] font-semibold text-fg/85">
                {setting.title}
              </span>
              <span className="mt-1.5 block text-[12.5px] leading-relaxed text-faint">
                {setting.description}
              </span>
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
