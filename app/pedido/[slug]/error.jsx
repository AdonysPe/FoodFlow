"use client";
export default function OrderingError({ reset }) {
  return <main id="main" className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-2xl font-bold">No pudimos cargar el restaurante</h1><p className="my-5">Revisa tu conexión e inténtalo de nuevo.</p><button className="min-h-11 rounded-xl bg-accent-500 px-5 py-3 text-on-accent" onClick={reset}>Volver a intentar</button></main>;
}
