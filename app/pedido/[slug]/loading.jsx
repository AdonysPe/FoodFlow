export default function Loading() {
  return <main id="main" aria-busy="true" aria-label="Cargando restaurante" className="mx-auto max-w-6xl animate-pulse p-6"><div className="mb-8 h-44 rounded-2xl bg-fg/10" /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(n => <div key={n} className="h-72 rounded-2xl bg-fg/10" />)}</div><span className="sr-only">Cargando carta…</span></main>;
}
