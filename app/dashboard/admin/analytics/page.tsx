import { prisma } from "@/lib/db/prisma";
import GlassCard from "@/components/ui/GlassCard";
import AreaChart from "@/components/dashboard/AreaChart";
import FunnelChart from "@/components/dashboard/FunnelChart";

export const metadata = {
  title: "Analytics",
};

const DAYS = 30;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DAYS - 1));

  const [recentLeads, totalLeads, contactedOrBeyond, convertedCount] = await Promise.all([
    prisma.clientLead.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.clientLead.count(),
    prisma.clientLead.count({ where: { status: { in: ["contacted", "converted"] } } }),
    prisma.clientLead.count({ where: { status: "converted" } }),
  ]);

  const dateKeys: string[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dateKey(d);
  });
  const countMap = new Map(dateKeys.map((k) => [k, 0]));
  for (const lead of recentLeads) {
    const key = dateKey(lead.createdAt);
    if (countMap.has(key)) countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  const dailyCounts = dateKeys.map((k) => countMap.get(k) ?? 0);

  const labelIndexes = [0, Math.floor((DAYS - 1) / 3), Math.floor((2 * (DAYS - 1)) / 3), DAYS - 1];
  const labels = labelIndexes.map((i) =>
    new Date(dateKeys[i]).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );

  const funnelStages = [
    { label: "Total leads", value: totalLeads },
    { label: "Contacted", value: contactedOrBeyond },
    { label: "Converted", value: convertedCount },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-fg/90">Leads over time</h2>
          <span className="text-[12px] text-faint">Last {DAYS} days</span>
        </div>
        <AreaChart data={dailyCounts} labels={labels} />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <h2 className="mb-5 text-[15px] font-semibold text-fg/90">Conversion funnel</h2>
        <FunnelChart stages={funnelStages} />
      </GlassCard>
    </div>
  );
}
