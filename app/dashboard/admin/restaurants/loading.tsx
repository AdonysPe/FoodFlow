/**
 * Shown while the restaurant list is being fetched on the server — including
 * every filter change, because the filters navigate rather than fetch. Six
 * rows is roughly a screenful, so the page does not jump when the real table
 * arrives.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando restaurantes…</span>

      <div className="flex flex-col gap-2">
        <div className="h-5 w-64 rounded bg-fg/[0.07]" />
        <div className="h-3.5 w-96 max-w-full rounded bg-fg/[0.05]" />
      </div>

      <div className="h-14 rounded-xl bg-fg/[0.04]" />

      <div className="overflow-hidden rounded-xl border border-fg/[0.07]">
        {Array.from({ length: 6 }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-5 border-b border-fg/[0.04] px-5 py-4 last:border-0"
          >
            <div className="h-3.5 flex-1 rounded bg-fg/[0.06]" />
            <div className="h-3.5 w-48 rounded bg-fg/[0.05]" />
            <div className="h-6 w-24 rounded-full bg-fg/[0.05]" />
            <div className="h-3.5 w-36 rounded bg-fg/[0.05]" />
            <div className="h-8 w-24 rounded-lg bg-fg/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
