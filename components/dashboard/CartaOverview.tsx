import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/dashboard/StatTile";
import { IconMenuBook, IconCheck, IconBolt } from "@/components/ui/Icons";
import {
  FEATURE_LABELS,
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICES,
  type PlanValue,
} from "@/lib/plans";

// The Carta plan has no orders, so the usual sales tiles would all read zero
// forever. This is the overview that plan actually earns: the state of the
// menu, plus an honest look at what the next plan turns on.
export default function CartaOverview({
  restaurantName,
  plan,
  itemCount,
  availableCount,
  categoryCount,
  soldOut,
}: {
  restaurantName: string;
  plan: PlanValue;
  itemCount: number;
  availableCount: number;
  categoryCount: number;
  soldOut: { id: string; name: string }[];
}) {
  const next: PlanValue = "servicio";
  const unlocks = PLAN_FEATURES[next].filter((f) => !PLAN_FEATURES[plan].includes(f));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[19px] font-bold tracking-[-0.01em] text-white">
          {restaurantName}
        </h1>
        <p className="mt-0.5 text-[12.5px] text-white/45">
          Plan {PLAN_LABELS[plan]} · tu carta digital
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Platos en la carta"
          value={itemCount}
          icon={<IconMenuBook className="h-4 w-4" />}
        />
        <StatTile
          label="Disponibles"
          value={availableCount}
          icon={<IconCheck className="h-4 w-4" />}
        />
        <StatTile
          label="Categorías"
          value={categoryCount}
          icon={<IconBolt className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white/90">Agotados ahora</h2>
            <Link
              href="/dashboard/app/menu"
              className="text-[13px] font-medium text-accent-400 hover:text-accent-300"
            >
              Ir a la carta
            </Link>
          </div>
          {itemCount === 0 ? (
            <p className="py-6 text-center text-[14px] text-white/40">
              Tu carta está vacía. Agrega tu primer plato.
            </p>
          ) : soldOut.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-white/40">
              Todo disponible. Nada marcado como agotado.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.05]">
              {soldOut.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-[14px] text-white/70">{item.name}</span>
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-medium text-white/50 ring-1 ring-inset ring-white/15">
                    Agotado
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <h2 className="text-[15px] font-semibold text-white/90">
            Con el plan {PLAN_LABELS[next]}
          </h2>
          <p className="mt-1 text-[12.5px] text-white/40">
            {PLAN_PRICES[next]}/mes · lo que se abre en este panel
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {unlocks.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13.5px] text-white/70">
                <IconCheck className="h-3.5 w-3.5 shrink-0 text-accent-400" />
                {FEATURE_LABELS[f]}
              </li>
            ))}
          </ul>
          <a
            href="https://wa.me/51950360685"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block rounded-xl border border-accent-400/30 bg-accent-400/[0.12] px-4 py-2 text-[13px] font-semibold text-accent-200 transition-colors hover:bg-accent-400/20"
          >
            Hablar para subir de plan
          </a>
        </GlassCard>
      </div>
    </div>
  );
}
