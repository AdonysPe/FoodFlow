const TONE: Record<string, string> = {
  new: "bg-accent-400/10 text-accent-ink ring-accent-400/25",
  contacted: "bg-fg/[0.06] text-fg/70 ring-fg/15",
  converted: "bg-mint/10 text-mint-ink ring-mint/25",
  pending: "bg-accent-400/10 text-accent-ink ring-accent-400/25",
  preparing: "bg-violet/10 text-violet-ink ring-violet/25",
  ready: "bg-mint/10 text-mint-ink ring-mint/25",
  delivered: "bg-fg/[0.06] text-fg/60 ring-fg/15",
  // Form-lead pipeline (Lead model): nuevo → contactado → cita → cliente.
  nuevo: "bg-accent-400/10 text-accent-ink ring-accent-400/25",
  contactado: "bg-fg/[0.06] text-fg/70 ring-fg/15",
  cita: "bg-violet/10 text-violet-ink ring-violet/25",
  cliente: "bg-mint/10 text-mint-ink ring-mint/25",
  archivado: "bg-fg/[0.04] text-fg/40 ring-fg/10",
};

const LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Lista",
  delivered: "Entregada",
  nuevo: "Nuevo",
  contactado: "Contactado",
  cita: "Cita",
  cliente: "Cliente",
  archivado: "Archivado",
};

export default function StatusPill({ status }: { status: string }) {
  const tone = TONE[status] ?? TONE.new;
  const label = LABEL[status] ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
