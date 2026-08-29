"use client";

import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { addStaffMember, removeStaffMember, type StaffMemberDTO } from "@/lib/actions/staff";

const ghostButton =
  "rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40";
const dangerButton =
  "rounded-lg bg-accent-500 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-40";

function MemberRow({ member }: { member: StaffMemberDTO }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await removeStaffMember(member.membershipId);
      pushToast(result.ok ? "Se quitó a esa persona del equipo." : result.error, result.ok ? "success" : "error");
      setConfirming(false);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-3.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-bold text-white/70">
          {member.email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-white/85">{member.email}</p>
          <p className="text-[12px] text-white/40">
            {member.active ? "Mozo · ya inició sesión" : "Mozo · pendiente de primer inicio"}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={remove}
        onBlur={() => setConfirming(false)}
        className={confirming ? dangerButton : ghostButton}
      >
        {confirming ? "¿Confirmar?" : "Quitar"}
      </button>
    </li>
  );
}

export default function EquipoManager({ members }: { members: StaffMemberDTO[] }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addStaffMember({ email });
      if (result.ok) {
        setEmail("");
        pushToast("Mozo agregado. Pídele que inicie sesión con su correo.", "success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[19px] font-bold tracking-[-0.01em] text-white">Equipo</h1>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-white/45">
          Agrega a tus mozos por correo. Cada uno inicia sesión con su propio correo y un código —
          solo verán la pantalla de comanda, nunca la administración de la carta ni los reportes.
        </p>
      </div>

      <GlassCard className="p-5 sm:p-6" hoverLift={false}>
        <h2 className="mb-3 text-[15px] font-semibold text-white/90">Agregar mozo</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mozo@correo.com"
            className="h-11 w-full flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
          <Button type="submit" size="md" className="shrink-0" disabled={isPending}>
            {isPending ? "Agregando…" : "Agregar"}
          </Button>
        </form>
        {error && <p className="mt-2.5 text-[13px] text-accent-400">{error}</p>}
      </GlassCard>

      {members.length === 0 ? (
        <GlassCard className="p-10 text-center" hoverLift={false}>
          <p className="text-[14px] text-white/45">
            Aún no hay mozos en el equipo. Agrega el primero arriba.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0" hoverLift={false}>
          <ul className="flex flex-col">
            {members.map((m) => (
              <MemberRow key={m.membershipId} member={m} />
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
