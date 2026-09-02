import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import StatTile from "@/components/dashboard/StatTile";
import StatusPill from "@/components/dashboard/StatusPill";
import GlassCard from "@/components/ui/GlassCard";
import { IconUsers, IconTrendUp, IconCheck, IconTarget, IconStore, IconMail } from "@/components/ui/Icons";

export const metadata = {
  title: "Overview",
};

export default async function OverviewPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    newLast7Days,
    convertedCount,
    activeRestaurants,
    recentLeads,
    totalContacts,
    newContactsLast7Days,
    recentContacts,
  ] = await Promise.all([
    prisma.clientLead.count(),
    prisma.clientLead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.clientLead.count({ where: { status: "converted" } }),
    prisma.restaurant.count(),
    prisma.clientLead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Contactos (formulario)"
          value={totalContacts}
          icon={<IconMail className="h-4 w-4" />}
        />
        <StatTile
          label="Contactos nuevos (7 días)"
          value={newContactsLast7Days}
          icon={<IconTrendUp className="h-4 w-4" />}
        />
        <StatTile
          label="Restaurantes activos"
          value={activeRestaurants}
          icon={<IconStore className="h-4 w-4" />}
        />
        <StatTile label="Leads email (chat)" value={totalLeads} icon={<IconUsers className="h-4 w-4" />} />
        <StatTile label="Leads convertidos" value={convertedCount} icon={<IconCheck className="h-4 w-4" />} />
        <StatTile
          label="Conversión leads email"
          value={conversionRate}
          decimals={1}
          suffix="%"
          icon={<IconTarget className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white/90">Contactos recientes</h2>
            <Link
              href="/dashboard/admin/contactos"
              className="text-[13px] font-medium text-accent-400 hover:text-accent-300"
            >
              Ver todos
            </Link>
          </div>
          {recentContacts.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-white/40">
              Sin contactos del formulario todavía.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.05]">
              {recentContacts.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 text-[14px] text-white/80">
                    <span className="font-medium">{lead.nombre}</span>
                    <span className="text-white/40"> · {lead.restaurante}</span>
                  </span>
                  <StatusPill status={lead.status} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5 sm:p-6" hoverLift={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white/90">Leads por email (chat)</h2>
            <Link
              href="/dashboard/admin/leads"
              className="text-[13px] font-medium text-accent-400 hover:text-accent-300"
            >
              Ver todos
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-white/40">Sin leads todavía.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.05]">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between py-3">
                  <span className="text-[14px] text-white/80">{lead.email}</span>
                  <StatusPill status={lead.status} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
