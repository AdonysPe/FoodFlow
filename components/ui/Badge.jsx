export default function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-cream/10 bg-cream/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-cream/70 backdrop-blur-md ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
      </span>
      {children}
    </span>
  );
}
