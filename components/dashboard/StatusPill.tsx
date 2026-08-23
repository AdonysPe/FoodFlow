const TONE: Record<string, string> = {
  new: "bg-accent-400/10 text-accent-300 ring-accent-400/25",
  contacted: "bg-white/[0.06] text-white/70 ring-white/15",
  converted: "bg-mint/10 text-mint ring-mint/25",
};

const LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
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
