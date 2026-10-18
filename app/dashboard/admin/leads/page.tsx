import { prisma } from "@/lib/db/prisma";
import LeadsTable from "@/components/dashboard/LeadsTable";
import PageHeader from "@/components/dashboard/PageHeader";

export const metadata = {
  title: "Leads",
};

export default async function LeadsPage() {
  const leads = await prisma.clientLead.findMany({ orderBy: { createdAt: "desc" } });

  const rows = leads.map((lead) => ({
    id: lead.id,
    email: lead.email,
    status: lead.status,
    createdAtLabel: lead.createdAt.toLocaleDateString("es-PE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="VENTAS · LEADS DEL CHAT" title="Leads del chat" description="Correos que dejaron en el asistente de la web. Solo tienes el correo: escríbeles para pasarlos a Contactos." />
      <LeadsTable leads={rows} />
    </div>
  );
}
