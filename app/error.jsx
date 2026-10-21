"use client";

import { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";
import { CONTACT_EMAIL } from "@/lib/contact";

const LINES = [
  { text: "1 × página pedida" },
  { text: "se cayó en cocina", tone: "accent" },
  { text: "volvemos a prepararla" },
];

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
    <ErrorScreen
      code="500"
      lead="Algo se nos"
      last="rompió"
      copy="No es culpa tuya. Vuelve a intentarlo y, si sigue igual, escríbenos y lo revisamos hoy mismo."
      lines={LINES}
      foot="Reintentar"
      footnote={
        <>
          ¿Sigue igual? Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </>
      }
    >
      <button type="button" onClick={reset} className="lb-er-btn lb-er-btn--solid">
        Reintentar
      </button>
      <a href="/" className="lb-er-btn">
        Ir al inicio
      </a>
    </ErrorScreen>
  );
}
