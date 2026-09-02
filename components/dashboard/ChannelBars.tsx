export default function ChannelBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.every((d) => d.count === 0)) {
    return <p className="py-6 text-center text-[14px] text-white/40">Aún no hay pedidos.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="text-white/70">{d.label}</span>
            <span className="font-medium text-white/85">{d.count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent-300"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
