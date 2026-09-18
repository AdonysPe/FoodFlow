"use client";

export default function TableCartaError({ reset }) {
  return <main className="grid min-h-dvh place-items-center bg-[#FFF9ED] px-5 text-[#123B4A]">
    <div className="max-w-sm text-center">
      <h1 className="font-display text-3xl font-bold">No pudimos cargar la carta</h1>
      <p className="mt-3 text-sm text-[#667C80]">Revisa tu conexión e inténtalo de nuevo. Si continúa, avisa al personal.</p>
      <button type="button" onClick={reset} className="mt-6 min-h-12 rounded-xl bg-[#FF6B35] px-6 font-bold text-[#123B4A]">Reintentar</button>
    </div>
  </main>;
}
