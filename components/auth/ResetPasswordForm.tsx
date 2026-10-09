"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconCheck, IconLock, IconMail, IconShield } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField, PasswordRules } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
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
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ message: string }>("/api/auth/reset-password", { email, code, password });
      if (result.ok) {
        setDone(true);
        return;
      }
      fail(result.error);
    } catch {
      fail("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Tu contraseña está lista" description="Cerramos todas tus sesiones anteriores para proteger la cuenta.">
        <div className="lb-pop lb-lg-done lb-lg-done--left" role="status">
          <span className="lb-lg-done-mark lb-lg-done-mark--mint">
            <IconCheck className="h-7 w-7" />
          </span>
          <Link href="/login" className="lb-lg-submit lb-lg-submit--link">
            Ingresar con mi contraseña
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Define una nueva contraseña"
      description="Usa el código que enviamos a tu correo y elige una contraseña segura."
      shake={shake}
      onShakeEnd={() => setShake(false)}
      footer={
        <>
          ¿El código venció? <Link href={`/forgot-password?email=${encodeURIComponent(email)}`}>Solicita otro</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="lb-lg-form">
        <AuthField id="reset-email" label="Correo" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} />
        <AuthField id="reset-code" label="Código de 6 dígitos" icon={<IconShield className="h-[18px] w-[18px]" />} required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" disabled={pending} hint="Tienes un máximo de 3 intentos por código." />
        <PasswordField id="reset-password" label="Nueva contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
        <PasswordRules password={password} />
        <PasswordField id="reset-confirmation" label="Confirma tu contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} />
        <AuthAlert message={error} />
        <AuthSubmit pending={pending} label="Guardar nueva contraseña" pendingLabel="Actualizando" />
      </form>
    </AuthCard>
  );
}
