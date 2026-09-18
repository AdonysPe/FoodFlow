export default function LoadingTableCarta() {
  return <main className="min-h-dvh bg-[#FFF9ED] px-5 py-8 text-[#123B4A]" aria-busy="true">
    <div className="mx-auto max-w-5xl motion-safe:animate-pulse">
      <div className="h-16 w-2/3 rounded-xl bg-[#DCE9E6]" />
      <div className="mt-8 h-10 w-full rounded-xl bg-[#DCE9E6]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="h-60 rounded-2xl bg-[#DCE9E6]" />
        <div className="h-60 rounded-2xl bg-[#DCE9E6]" />
      </div>
      <p className="mt-4 text-sm">Cargando la carta de tu mesa…</p>
    </div>
  </main>;
}
