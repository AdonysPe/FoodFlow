"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconBuilding, IconLock, IconMail } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, AuthNotice, AuthSubmit, ConsentCheckbox, PasswordField, PasswordRules } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

export default function RegisterForm() {
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const selectedPlan = ["carta", "servicio", "negocio"].includes(requestedPlan ?? "") ? requestedPlan : null;
  const nextPath = selectedPlan
    ? `/dashboard/app/configuracion?plan=${encodeURIComponent(selectedPlan)}`
    : "/dashboard/app/overview";
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);

  function fail(message: string) {
    setError(message);
    setShake(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      fail("Las contraseñas no coinciden. Revisa la confirmación.");
      return;
    }
    if (!consent) {
      setConsentError(true);
      setShake(true);
      document.getElementById("register-consent")?.focus();
      return;
    }
    setError("");
    setConsentError(false);
    setPending(true);
    try {
      const result = await postAuth<{ role: "restaurant_owner" }>("/api/auth/register", { restaurant_name: restaurantName, email, password, consent });
      if (result.ok) {
        window.location.href = nextPath;
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
    <AuthCard
      title="Pon tu restaurante en movimiento"
      description="Crea tu espacio y empieza a configurar tu carta. Iniciarás sesión automáticamente."
      shake={shake}
      onShakeEnd={() => setShake(false)}
      footer={
        <>
          ¿Ya tienes cuenta? <Link href={selectedPlan ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>Ingresa aquí</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="lb-lg-form">
        {selectedPlan && (
          <AuthNotice tone="accent">
            Plan elegido: <strong style={{ textTransform: "capitalize" }}>{selectedPlan}</strong>. Lo revisarás y confirmarás desde tu restaurante.
          </AuthNotice>
        )}
        <AuthField id="restaurant-name" label="Nombre del restaurante" icon={<IconBuilding className="h-[18px] w-[18px]" />} required minLength={2} maxLength={80} autoComplete="organization" value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} placeholder="Ej. Sazón de Casa" disabled={pending} />
        <AuthField id="register-email" label="Correo" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@restaurante.com" disabled={pending} />
        <PasswordField id="register-password" label="Contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
        <PasswordRules password={password} />
        <PasswordField id="register-confirmation" label="Confirma tu contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} />
        <ConsentCheckbox
          id="register-consent"
          checked={consent}
          onChange={(checked) => {
            setConsent(checked);
            if (checked) setConsentError(false);
          }}
          error={consentError}
          errorMessage="Debes aceptar los Términos y la Política de Privacidad para crear tu cuenta."
        >
          He leído y acepto los{" "}
          <Link href="/terminos" target="_blank" className="lb-lg-inline">
            Términos y Condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="lb-lg-inline">
            Política de Privacidad
          </Link>
          , incluida la transferencia internacional de mis datos que ahí se describe.
        </ConsentCheckbox>
        <AuthAlert message={error} />
        <AuthSubmit pending={pending} label="Crear mi restaurante" pendingLabel="Creando tu espacio" />
      </form>
    </AuthCard>
  );
}
