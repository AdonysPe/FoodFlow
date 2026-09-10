"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/logging/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: window.location.pathname,
      }),
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0908",
          color: "#f3efe6",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "26rem" }}>
          <p style={{ margin: 0, fontSize: "48px", fontWeight: 800, color: "#ff5a33" }}>
            500
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "22px", fontWeight: 700 }}>
            Algo se nos rompió
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "15px", opacity: 0.7, lineHeight: 1.6 }}>
            El error fue registrado. Vuelve a intentarlo.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              border: 0,
              borderRadius: "12px",
              background: "#ff5a33",
              color: "#0c0908",
              padding: "13px 24px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
