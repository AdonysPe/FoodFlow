"use client";

import { useEffect } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { CONTACT_EMAIL } from "@/lib/contact";

/**
 * Anything that throws while rendering a route lands here instead of on the
 * host's default error page. `reset()` re-renders the segment, which is often
 * enough when the failure was a one-off.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    // Keeps the digest in the server logs where it can be traced.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,90,51,0.14),transparent_65%)] blur-3xl"
      />

      <div className="w-full max-w-md text-center">
        <a href="/" className="inline-flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-white">
            FoodFlow
          </span>
        </a>

        <p className="mt-10 font-display text-[4.5rem] font-extrabold leading-none tracking-[-0.05em] text-accent-400">
          500
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-white">
          Algo se nos rompió
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/62">
          No es culpa tuya. Vuelve a intentarlo y, si sigue igual, escríbenos y lo
          revisamos hoy mismo.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent-400 px-6 text-[15px] font-semibold text-ink-950 shadow-accent transition-transform duration-200 hover:-translate-y-0.5"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-cream/12 px-6 text-[15px] font-semibold text-cream/85 transition-colors hover:border-cream/25 hover:text-white"
          >
            Ir al inicio
          </a>
        </div>

        <p className="mt-6 text-[13px] text-cream/45">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline-offset-4 hover:text-cream/80 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
