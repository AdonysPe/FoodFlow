import type { ReactNode } from "react";
import Link from "next/link";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

// The B design's type pair, as on the home page: loaded for the auth routes
// only, and re-pointed to the theme's font roles by the `.lb` block at the end
// of globals.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-lb-display", display: "swap" });
const text = Geist({ subsets: ["latin"], variable: "--font-lb-text", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-lb-mono", display: "swap" });

/** What an order goes through, looped on the left of every auth screen. */
const STEPS = [
  {
    label: "Pedido recibido",
    detail: "Mesa 04 · 3 productos",
    tone: "accent",
    width: 1.9,
    icon: (
      <>
        <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
        <path d="M9 8.5h6M9 12.5h6" />
      </>
    ),
  },
  {
    label: "En preparación",
    detail: "Cocina sincronizada",
    tone: "cream",
    width: 1.9,
    icon: (
      <>
        <path d="M5 11h14v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" />
        <path d="M9 7c0-1 1-1.5 1-2.5M13 7c0-1 1-1.5 1-2.5" />
      </>
    ),
  },
  {
    label: "Listo para servir",
    detail: "El equipo recibe el aviso",
    tone: "mint",
    width: 2.2,
    icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  },
];

/**
 * The frame of every auth screen (login, register, forgot and reset password),
 * design B ("Noche"): pinned to the night theme, its own header, the looping
 * order on the left (hidden below 1040px so the form comes first on a phone)
 * and the screen's card on the right. The card brings its own entrance.
 *
 * Server component: everything here is CSS-driven, so the screens that use it
 * stay free to be client components.
 */
export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" className={`${display.variable} ${text.variable} ${mono.variable} lb lb-lg-page`}>
      <div className="lb-lg">
        <div className="lb-glow lb-lg-glow" aria-hidden />

        <header className="lb-lg-header">
          <Link href="/" className="lb-lg-logo" aria-label="Ir al inicio de FoodFlow">
            FoodFlow<span aria-hidden />
          </Link>
          <Link href="/" className="lb-lg-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Volver al inicio
          </Link>
        </header>

        <main id="main" className="lb-lg-body">
          <section className="lb-lg-pitch" aria-label="Así funciona FoodFlow">
            <h2 className="lb-pr-h1 lb-lg-title">
              <span className="lb-word" style={{ animationDelay: ".05s" }}>Cada</span>{" "}
              <span className="lb-word" style={{ animationDelay: ".15s" }}>pedido,</span>
              <br />
              <span className="lb-word" style={{ animationDelay: ".3s", color: "#8a8278" }}>en</span>{" "}
              <span className="lb-word" style={{ animationDelay: ".4s", color: "#8a8278" }}>su</span>{" "}
              <span className="lb-word" style={{ animationDelay: ".5s", color: "#8a8278" }}>
                lugar<span style={{ color: "#ff5a33" }}>.</span>
              </span>
            </h2>
            <p className="lb-rise lb-lg-lead" style={{ animationDelay: ".65s" }}>
              Entra y toma el control de tu carta, las mesas y la cocina desde una sola operación.
            </p>
            <div className="lb-rise lb-lg-flow" style={{ animationDelay: ".8s" }} aria-label="Flujo de un pedido">
              <div className="lb-lg-rail" aria-hidden>
                <span className="sig" />
              </div>
              <ol>
                {STEPS.map((step, index) => (
                  <li key={step.label} className={`lb-lg-st lb-lg-st${index + 1}`}>
                    <span className={`lb-lg-step-icon lb-lg-step-icon--${step.tone}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={step.width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {step.icon}
                      </svg>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{step.label}</span>
                      <span style={{ fontSize: 13, color: "#a39b90" }}>{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <div className="lb-rise lb-lg-side" style={{ animationDelay: ".3s" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
