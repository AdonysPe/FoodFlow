"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The boundary for the restaurant administration screens.
 *
 * It deliberately says nothing about what failed. A thrown guard
 * (`requirePermission`) lands here just like a database timeout, and the two
 * must look identical from outside: telling a visitor "no autorizado" would
 * confirm the route exists and is worth attacking. The real reason goes to the
 * server log, where the operator can read it.
 */
export default function RestaurantsAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/restaurants]", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-fg/10 bg-fg/[0.025] px-6 py-12 text-center">
      <h2 className="font-display text-[18px] font-bold text-fg">
        No pudimos cargar esta pantalla
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-faint">
        Vuelve a intentarlo. Si sigue pasando, revisa que tu sesión siga abierta y
        que tu cuenta tenga permisos de administración de plataforma.
        {error.digest ? ` Código: ${error.digest}.` : ""}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl bg-linear-to-b from-accent-400 to-accent-600 px-5 text-[13px] font-bold text-on-accent"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="min-h-11 rounded-xl border border-fg/15 px-4 py-3 text-[13px] font-semibold text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
