import { prisma } from "@/lib/db/prisma";
import ContactLeadsTable from "@/components/dashboard/ContactLeadsTable";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatSoles } from "@/lib/format";

export const metadata = {
  title: "Contactos",
};

// Rows from the landing contact form (Lead model / `leads` table): whoever
// left their name, restaurant and WhatsApp so the pilot can reach them. This
// is a different table from "Leads" (ClientLead) — that one is the email-only
// capture from the chat widget.
export default async function ContactosPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  const rows = leads.map((lead) => ({
    id: lead.id,
    nombre: lead.nombre,
    restaurante: lead.restaurante,
    whatsapp: lead.whatsapp,
    email: lead.email,
    source: lead.source,
    score: lead.score,
    perdidaAnualLabel: lead.perdidaAnual != null ? formatSoles(lead.perdidaAnual) : null,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    createdAtLabel: lead.createdAt.toLocaleDateString("es-PE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return (
    <div className="lbd-pg">
      <PageHeader eyebrow="VENTAS · CONTACTOS" title="Contactos" description="Quien dejó su WhatsApp en la web. Muévelo de columna a medida que avanza la conversación." />
      <ContactLeadsTable leads={rows} />
    </div>
  );
}
