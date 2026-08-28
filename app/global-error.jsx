"use client";

/**
 * Last resort: this replaces the root layout, so it cannot rely on the app's
 * stylesheet being there. Everything is inline on purpose.
 */
export default function GlobalError({ reset }) {
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
        <div style={{ maxWidth: "26rem" }}>
          <p style={{ margin: 0, fontSize: "48px", fontWeight: 800, color: "#ff5a33" }}>
            500
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "22px", fontWeight: 700 }}>
            Algo se nos rompió
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "15px", opacity: 0.7, lineHeight: 1.6 }}>
            Vuelve a intentarlo. Si sigue igual, escríbenos a adonispereda1@gmail.com y lo
            revisamos hoy mismo.
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
        </div>
      </body>
    </html>
  );
}
