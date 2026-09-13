"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconBuilding, IconLock, IconMail } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, ConsentCheckbox, LoadingIndicator, PasswordField, PasswordRules } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

export default function RegisterForm() {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden. Revisa la confirmación.");
      return;
    }
    if (!consent) {
      setConsentError(true);
      document.getElementById("register-consent")?.focus();
      return;
    }
    setError("");
    setConsentError(false);
    setPending(true);
    try {
      const result = await postAuth<{ role: "client" }>("/api/auth/register", { restaurant_name: restaurantName, email, password, consent });
      if (result.ok) {
        window.location.href = "/dashboard/app/overview";
        return;
      }
      setError(result.error);
    } catch {
      setError("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Pon tu restaurante en movimiento" description="Crea tu espacio y empieza a configurar tu carta. Iniciarás sesión automáticamente." footer={<p className="text-center text-[13px] text-muted">¿Ya tienes cuenta?{" "}<Link href="/login" className="font-semibold text-accent-icon underline-offset-4 hover:underline">Ingresa aquí</Link></p>}>
      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
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
          <Link href="/terminos" target="_blank" className="font-medium text-accent-icon underline-offset-4 hover:underline">
            Términos y Condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="font-medium text-accent-icon underline-offset-4 hover:underline">
            Política de Privacidad
          </Link>
          , incluida la transferencia internacional de mis datos que ahí se describe.
        </ConsentCheckbox>
        <AuthAlert message={error} />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending} icon={pending ? <LoadingIndicator /> : <IconArrowRight className="h-4 w-4" />}>{pending ? "Creando tu espacio" : "Crear mi restaurante"}</Button>
      </form>
    </AuthCard>
  );
}
