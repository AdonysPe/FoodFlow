export default function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-white/70 backdrop-blur-md ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
      </span>
      {children}
    </span>
  );
}
