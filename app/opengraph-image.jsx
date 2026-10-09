import { ImageResponse } from "next/og";

/**
 * The card that shows up when the link is pasted into WhatsApp. Generated
 * rather than shipped as a PNG, so it never drifts from the pitch: change the
 * headline here and the preview changes with it.
 *
 * Satori (what renders this) supports a subset of CSS: every container with
 * more than one child needs an explicit display, and layout is flexbox only.
 */
export const alt =
  "FoodFlow — Tu restaurante funcionando en 48 horas. Programa piloto en Lima.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          // Satori wants the fill and the gradient as separate properties: a
          // `background` shorthand that mixes a colour into the layer list is
          // rejected outright.
          backgroundColor: "#0c0908",
          backgroundImage:
            "radial-gradient(120% 120% at 85% 15%, rgba(255,90,51,0.32), transparent 60%)",
          color: "#f3efe6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "#ff5a33",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <g
                stroke="#0c0908"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 8v5c0 3 6 2 6 5" />
                <path d="M16 8v16" />
                <path d="M22 8v5c0 3-6 2-6 5" />
              </g>
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: "36px", fontWeight: 700 }}>FoodFlow</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "76px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-3px",
              maxWidth: "900px",
            }}
          >
            Tu restaurante funcionando en 48 horas
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "26px",
              fontSize: "30px",
              color: "rgba(243,239,230,0.65)",
              maxWidth: "820px",
            }}
          >
            Pedidos, cocina, carta y números en un solo panel.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: "999px",
              background: "#ff5a33",
              color: "#0c0908",
              padding: "14px 26px",
              fontSize: "26px",
              fontWeight: 700,
            }}
          >
            Programa piloto en Lima
          </div>
          <div style={{ display: "flex", fontSize: "26px", color: "rgba(243,239,230,0.55)" }}>
            Sin comisión por pedido · 7 días gratis
          </div>
        </div>
      </div>
    ),
    size
  );
}
