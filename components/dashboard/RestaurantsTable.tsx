import GlassCard from "@/components/ui/GlassCard";

export type RestaurantRow = {
  id: string;
  name: string;
  ownerEmail: string;
  createdAtLabel: string;
};

export default function RestaurantsTable({ restaurants }: { restaurants: RestaurantRow[] }) {
  if (restaurants.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No restaurants yet. Create the first one to get started.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Name</th>
              <th className="px-5 py-3.5 font-medium">Owner</th>
              <th className="px-5 py-3.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3.5 font-medium text-white/85">{r.name}</td>
                <td className="px-5 py-3.5 text-white/55">{r.ownerEmail}</td>
                <td className="px-5 py-3.5 text-white/45">{r.createdAtLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
