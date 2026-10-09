"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconLock, IconMail } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField, RememberCheckbox } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

type SessionRole = "platform_admin" | "restaurant_owner" | "restaurant_admin" | "restaurant_staff";

function targetForRole(role: SessionRole, next: string | null) {
  if (next?.startsWith("/dashboard")) return next;
  if (role === "platform_admin") return "/dashboard/admin/overview";
  if (role === "restaurant_staff") return "/dashboard/comanda";
  return "/dashboard/app/overview";
}

/**
 * The sign-in card (design B, "Noche"); the frame around it is AuthPageShell.
 *
 * `postAuth("/api/auth/login")` with the CSRF token, `remember`, the
 * role-based landing and the `password_setup_required` hand-off to
 * /forgot-password are what they always were. The prototype's "Listo, ya
 * entraste" card shows while the browser leaves for the dashboard.
 */
export default function LoginFlow() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  if (target) {
    return (
      <section className="lb-lg-card">
        <div className="lb-pop lb-lg-done" role="status">
          <span className="lb-lg-done-mark">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span className="lb-display" style={{ fontSize: 30, letterSpacing: "-0.04em" }}>Listo, ya entraste.</span>
          <span style={{ fontSize: 15, color: "#b9b1a5" }}>Te llevamos al resumen de tu restaurante.</span>
          <a href={target} className="lb-pill-btn lb-pill-btn--lg" style={{ marginTop: 8 }}>
            Ir a mi panel
          </a>
        </div>
      </section>
    );
  }

  return (
    <AuthCard
      title="Qué bueno verte de nuevo"
      description="Ingresa para continuar con la operación de tu restaurante."
      shake={shake}
      onShakeEnd={() => setShake(false)}
      footer={
        <>
          ¿Aún no tienes cuenta? <Link href="/register">Crea tu restaurante</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="lb-lg-form">
        <AuthField
          id="login-email"
          label="Correo"
          icon={<IconMail className="h-[18px] w-[18px]" />}
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
          invalid={touched && !emailOk}
        />
        <PasswordField
          id="login-password"
          label="Contraseña"
          icon={<IconLock className="h-[18px] w-[18px]" />}
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
          invalid={touched && !passOk}
          labelAction={
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="lb-lg-forgot">
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />
        <RememberCheckbox id="login-remember" checked={remember} onChange={setRemember} disabled={pending} label="Mantener sesión iniciada en este dispositivo" hint="Hasta 30 días. Úsalo solo en tu propio equipo; en uno compartido, déjalo sin marcar." />
        <AuthAlert message={error} />
        <AuthSubmit pending={pending} label="Ingresar a FoodFlow" pendingLabel="Ingresando" />
      </form>
    </AuthCard>
  );
}
