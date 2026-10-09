"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconMail, IconShield } from "@/components/ui/Icons";
import { AuthAlert, AuthCard, AuthField, AuthNotice, AuthSubmit } from "@/components/auth/AuthForm";
import { postAuth } from "@/lib/auth/client";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);
  const isSetup = searchParams.get("setup") === "1";

  function fail(message: string) {
    setError(message);
    setShake(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await postAuth<{ message: string }>("/api/auth/forgot-password", { email });
      if (result.ok) {
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
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
      title={isSetup ? "Crea tu contraseña" : "Recupera el acceso"}
      description={isSetup ? "Verificaremos tu correo para que puedas definir tu primera contraseña." : "Te enviaremos un código de 6 dígitos. Estará disponible durante 10 minutos."}
      shake={shake}
      onShakeEnd={() => setShake(false)}
      footer={<Link href="/login">Volver al inicio de sesión</Link>}
    >
      <div style={{ marginTop: "clamp(14px, 3.2svh, 24px)" }}>
        <AuthNotice icon={<IconShield className="h-5 w-5 shrink-0" />}>El código solo se enviará si el correo pertenece a una cuenta registrada.</AuthNotice>
      </div>
      <form onSubmit={handleSubmit} className="lb-lg-form" style={{ marginTop: "clamp(12px, 2.4svh, 20px)" }}>
        <AuthField id="forgot-email" label="Correo de tu cuenta" icon={<IconMail className="h-[18px] w-[18px]" />} type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@restaurante.com" disabled={pending} />
        <AuthAlert message={error} />
        <AuthSubmit pending={pending} label="Enviar código de acceso" pendingLabel="Enviando el código" />
      </form>
    </AuthCard>
  );
}
