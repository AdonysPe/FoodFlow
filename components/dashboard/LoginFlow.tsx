"use client";

import { useState } from "react";
import type { FormEvent, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { postAuth } from "@/lib/auth/client";

type SessionRole = "platform_admin" | "restaurant_owner" | "restaurant_admin" | "restaurant_staff";

function targetForRole(role: SessionRole, next: string | null) {
  if (next?.startsWith("/dashboard")) return next;
  if (role === "platform_admin") return "/dashboard/admin/overview";
  if (role === "restaurant_staff") return "/dashboard/comanda";
  return "/dashboard/app/overview";
}

function Icon({ size = 18, strokeWidth = 1.8, children, ...rest }: { size?: number; strokeWidth?: number; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

/** What an order goes through, looped on the left of the screen. */
const STEPS = [
  {
    label: "Pedido recibido",
    detail: "Mesa 04 · 3 productos",
    tone: "accent",
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
    icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  },
];

/**
 * /login, design B ("Noche"), as approved in the prototype: the looping order
 * on the left and the glass sign-in card on the right (the order is hidden
 * below 1040px so the form comes first on a phone).
 *
 * The sign-in itself is the one that was here: `postAuth("/api/auth/login")`
 * with the CSRF token, `remember`, the role-based landing and the
 * `password_setup_required` hand-off to /forgot-password. The prototype's
 * "Listo, ya entraste" card shows while the browser leaves for the dashboard.
 * Register, forgot and reset still use `AuthPageShell`.
 */
export default function LoginFlow() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  const emailOk = /.+@.+\..+/.test(email.trim());
  const passOk = password.length >= 8;

  function fail(message: string) {
    setError(message);
    setShake(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!emailOk || !passOk) {
      setTouched(true);
      fail(!emailOk ? "Escribe un correo válido, como tu@restaurante.com." : "La contraseña tiene al menos 8 caracteres.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ role: SessionRole }>("/api/auth/login", { email: email.trim(), password, remember });
      if (result.ok) {
        const destination = targetForRole(result.data.role, searchParams.get("next"));
        setTarget(destination);
        window.location.href = destination;
        return;
      }
      if (result.code === "password_setup_required") {
        window.location.href = `/forgot-password?email=${encodeURIComponent(email)}&setup=1`;
        return;
      }
      fail(result.error);
    } catch {
      fail("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="lb-lg">
      <div className="lb-glow lb-lg-glow" aria-hidden />

      <header className="lb-lg-header">
        <Link href="/" className="lb-lg-logo" aria-label="Ir al inicio de FoodFlow">
          FoodFlow<span aria-hidden />
        </Link>
        <Link href="/" className="lb-lg-back">
          <Icon size={14} strokeWidth={2.2}>
            <path d="M15 6l-6 6 6 6" />
          </Icon>
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
                <li key={step.label} className={`st s${index + 1}`}>
                  <span className={`lb-lg-step-icon lb-lg-step-icon--${step.tone}`}>
                    <Icon strokeWidth={step.tone === "mint" ? 2.2 : 1.9}>{step.icon}</Icon>
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
          <div className={`lb-lg-card${shake ? " shake" : ""}`} onAnimationEnd={(event) => event.animationName.includes("shake") && setShake(false)}>
            {target ? (
              <div className="lb-pop lb-lg-done" role="status">
                <span className="lb-lg-done-mark">
                  <Icon size={28} strokeWidth={2.6}>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </Icon>
                </span>
                <span className="lb-display" style={{ fontSize: 30, letterSpacing: "-0.04em" }}>Listo, ya entraste.</span>
                <span style={{ fontSize: 15, color: "#b9b1a5" }}>Te llevamos al resumen de tu restaurante.</span>
                <a href={target} className="lb-pill-btn lb-pill-btn--lg" style={{ marginTop: 8 }}>
                  Ir a mi panel
                </a>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h1 className="lb-lg-card-title">Qué bueno verte de nuevo</h1>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#b9b1a5" }}>Ingresa para continuar con la operación de tu restaurante.</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="lb-lg-form">
                  <div className="lb-lg-field">
                    <label htmlFor="login-email">Correo</label>
                    <div className={`lb-lg-input${touched && !emailOk ? " is-bad" : ""}`}>
                      <Icon>
                        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                        <path d="M3.5 7l8.5 6 8.5-6" />
                      </Icon>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoFocus
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError("");
                        }}
                        placeholder="tu@restaurante.com"
                        disabled={pending}
                      />
                    </div>
                  </div>

                  <div className="lb-lg-field">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      <label htmlFor="login-password">Contraseña</label>
                      <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="lb-lg-forgot">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <div className={`lb-lg-input lb-lg-input--end${touched && !passOk ? " is-bad" : ""}`}>
                      <Icon>
                        <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </Icon>
                      <input
                        id="login-password"
                        type={show ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={72}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError("");
                        }}
                        placeholder="Mínimo 8 caracteres"
                        disabled={pending}
                      />
                      <button type="button" className="lb-lg-eye" onClick={() => setShow((current) => !current)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
                        {show ? (
                          <Icon>
                            <path d="M3 3l18 18" />
                            <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.5.8-1.6 2.3-3.2 3.6M6.4 7.6C4.6 8.9 3.2 10.7 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1" />
                          </Icon>
                        ) : (
                          <Icon>
                            <path d="M2.5 12c1-1.5 4.5-6 9.5-6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6z" />
                            <circle cx="12" cy="12" r="3" />
                          </Icon>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="button" role="checkbox" aria-checked={remember} className="lb-lg-remember" onClick={() => setRemember((current) => !current)} disabled={pending}>
                    <span className={`lb-lg-box${remember ? " is-on" : ""}`}>
                      {remember && (
                        <Icon size={13} strokeWidth={3.2}>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </Icon>
                      )}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 550 }}>Mantener sesión iniciada en este dispositivo</span>
                      <span style={{ fontSize: 12, lineHeight: 1.45, color: "#a39b90" }}>Hasta 30 días. Úsalo solo en tu propio equipo; en uno compartido, déjalo sin marcar.</span>
                    </span>
                  </button>

                  {error && (
                    <div role="alert" className="lb-pop lb-lg-alert">
                      <Icon size={16} strokeWidth={2.2}>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5v5.5M12 16.5v.01" />
                      </Icon>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="lb-lg-submit" disabled={pending}>
                    {pending && <span className="spin" aria-hidden />}
                    {pending ? "Ingresando" : "Ingresar a FoodFlow"}
                    {!pending && (
                      <Icon size={16} strokeWidth={2.4}>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </Icon>
                    )}
                  </button>
                </form>

                <p className="lb-lg-foot">
                  ¿Aún no tienes cuenta? <Link href="/register">Crea tu restaurante</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
