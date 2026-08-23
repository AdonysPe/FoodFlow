import { prisma } from "@/lib/db/prisma";
import LeadsTable from "@/components/dashboard/LeadsTable";

export const metadata = {
  title: "Leads",
};

export default async function LeadsPage() {
  const leads = await prisma.clientLead.findMany({ orderBy: { createdAt: "desc" } });

  const rows = leads.map((lead) => ({
    id: lead.id,
    email: lead.email,
    status: lead.status,
    createdAtLabel: lead.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return <LeadsTable leads={rows} />;
}
