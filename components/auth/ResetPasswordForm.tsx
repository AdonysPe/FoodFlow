"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import Button from "@/components/ui/Button";
import { IconArrowRight, IconCheck, IconLock, IconMail, IconShield } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, LoadingIndicator, PasswordField, PasswordRules } from "@/components/auth/AuthForm";
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden. Revisa la confirmación.");
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
      setError(result.error);
    } catch {
      setError("No pudimos conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <m.div key="success" initial={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <AuthCard title="Tu contraseña está lista" description="Cerramos todas tus sesiones anteriores para proteger la cuenta.">
            <div className="mt-7">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint/10 text-mint-ink ring-1 ring-inset ring-mint/20"><IconCheck className="h-7 w-7" /></span>
              <Button href="/login" size="lg" className="mt-7 w-full" icon={<IconArrowRight className="h-4 w-4" />}>Ingresar con mi contraseña</Button>
            </div>
          </AuthCard>
        </m.div>
      ) : (
        <m.div key="form" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          <AuthCard title="Define una nueva contraseña" description="Usa el código que enviamos a tu correo y elige una contraseña segura." footer={<p className="text-center text-[13px] text-muted">¿El código venció?{" "}<Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="font-semibold text-accent-icon underline-offset-4 hover:underline">Solicita otro</Link></p>}>
            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <AuthField id="reset-email" label="Correo" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} />
              <AuthField id="reset-code" label="Código de 6 dígitos" icon={<IconShield className="h-[18px] w-[18px]" />} required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" disabled={pending} hint="Tienes un máximo de 3 intentos por código." />
              <PasswordField id="reset-password" label="Nueva contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
              <PasswordRules password={password} />
              <PasswordField id="reset-confirmation" label="Confirma tu contraseña" icon={<IconLock className="h-[18px] w-[18px]" />} required minLength={8} maxLength={72} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} />
              <AuthAlert message={error} />
              <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending} icon={pending ? <LoadingIndicator /> : <IconArrowRight className="h-4 w-4" />}>{pending ? "Actualizando" : "Guardar nueva contraseña"}</Button>
            </form>
          </AuthCard>
        </m.div>
      )}
    </AnimatePresence>
  );
}
