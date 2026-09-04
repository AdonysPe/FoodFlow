import { LogoMark } from "@/components/ui/Logo";

export const metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.14),transparent_65%)] blur-3xl"
      />

      <div className="w-full max-w-md text-center">
        <a href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-fg">
            FoodFlow
          </span>
        </a>

        <p className="mt-10 font-display text-[4.5rem] font-extrabold leading-none tracking-[-0.05em] text-accent-icon">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-fg">
          Esta página no existe
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/62">
          Puede que el enlace esté mal escrito o que la hayamos movido. Volvamos a lo
          importante: tu restaurante funcionando en 48 horas.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent-400 px-6 text-[15px] font-semibold text-ink-950 shadow-accent transition-transform duration-200 hover:-translate-y-0.5"
          >
            Ir al inicio
          </a>
          <a
            href="/#cta"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-cream/12 px-6 text-[15px] font-semibold text-cream/85 transition-colors hover:border-cream/25 hover:text-fg"
          >
            Ver el piloto
          </a>
        </div>
      </div>
    </main>
  );
}
