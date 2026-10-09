"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { addStaffMember, removeStaffMember, type StaffMemberDTO } from "@/lib/actions/staff";

const AVATARS = [
  { bg: "#ff5a33", fg: "#0c0908" },
  { bg: "#f3efe6", fg: "#0c0908" },
  { bg: "#3a302b", fg: "#f3efe6" },
];

function MemberRow({ member, index }: { member: StaffMemberDTO; index: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const avatar = AVATARS[index % AVATARS.length];

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
    <li className="lbd-eq-row">
      <span className="lbd-cu-av" style={{ background: avatar.bg, color: avatar.fg }}>
        {member.email.charAt(0).toUpperCase()}
      </span>
      <span className="lbd-or-cell" style={{ minWidth: 0 }}>
        <span className="lbd-or-main lbd-trunc">{member.email}</span>
        <span className="lbd-or-sub">{member.active ? "Ya inició sesión" : "Pendiente de primer inicio"}</span>
      </span>
      <span className="lbd-eq-role">Mozo</span>
      <span className={`lbd-eq-state${member.active ? " is-on" : ""}`}>{member.active ? "Con acceso" : "Invitado"}</span>
      <button type="button" disabled={isPending} onClick={remove} onBlur={() => setConfirming(false)} className={`lbd-btn lbd-btn--sm ${confirming ? "lbd-btn--solid" : "lbd-btn--ghost"}`} style={confirming ? { fontSize: 13 } : undefined}>
        {confirming ? "¿Confirmar?" : "Quitar"}
      </button>
    </li>
  );
}

/**
 * Equipo, design B: the seat bar on top, the people who have access, and a
 * card to add a waiter by email. Waiters only ever see the comanda screen, so
 * the "what each role sees" block lists the two roles that exist.
 */
export default function EquipoManager({
  members,
  maxUsers,
  seatsLeft,
}: {
  members: StaffMemberDTO[];
  // null on an uncapped plan.
  maxUsers: number | null;
  seatsLeft: number | null;
}) {
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

  const full = seatsLeft != null && seatsLeft <= 0;
  const used = members.length + 1;

  return (
    <>
      {maxUsers != null && (
        <div className="lbd-card lbd-rise lbd-eq-seats" style={{ animationDelay: ".05s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              <span className="lbd-display" style={{ fontSize: 26, letterSpacing: "-0.04em", marginRight: 6 }}>
                {used}
              </span>
              de {maxUsers} usuarios
            </span>
            <span style={{ fontSize: 13, color: full ? "#ff9a7d" : "#a39b90" }}>{seatsLeft != null && seatsLeft > 0 ? `Quedan ${seatsLeft}` : "Sin cupo libre"}</span>
          </div>
          <div className="lbd-track" aria-hidden>
            <div className="lbd-bar" style={{ width: `${Math.min(100, Math.round((used / maxUsers) * 100))}%`, background: full ? "#ff5a33" : "#f3efe6" }} />
          </div>
        </div>
      )}

      <div className="lbd-eq">
        <section className="lbd-card lbd-rise lbd-or-list" style={{ animationDelay: ".08s" }} aria-label="Personas con acceso">
          <ul className="lbd-eq-list">
            <li className="lbd-eq-row">
              <span className="lbd-cu-av" style={{ background: "#ff5a33", color: "#0c0908" }}>
                Tú
              </span>
              <span className="lbd-or-cell" style={{ minWidth: 0 }}>
                <span className="lbd-or-main">Tú</span>
                <span className="lbd-or-sub">Dueño de la cuenta</span>
              </span>
              <span className="lbd-eq-role">Dueño</span>
              <span className="lbd-eq-state is-on">Con acceso</span>
              <span className="lbd-eq-spacer" aria-hidden />
            </li>
            {members.map((m, i) => (
              <MemberRow key={m.membershipId} member={m} index={i + 1} />
            ))}
            {members.length === 0 && (
              <li className="lbd-empty" style={{ border: 0, margin: 0 }}>
                Aún no hay mozos en el equipo. Agrega el primero.
              </li>
            )}
          </ul>
        </section>

        <aside className="lbd-eq-side">
          <form onSubmit={handleAdd} className="lbd-card lbd-card--glass lbd-rise lbd-eq-add" style={{ animationDelay: ".12s" }}>
            <span className="lbd-cm-eyebrow">Agregar a alguien</span>
            <h2 className="lbd-cf-h">Nuevo mozo</h2>
            <label htmlFor="eq-email" style={{ fontSize: 13, color: "#a39b90" }}>
              Correo del mozo
            </label>
            <input id="eq-email" type="email" required disabled={full} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mozo@correo.com" className="lbd-input" />
            <button type="submit" disabled={isPending || full} className="lbd-btn lbd-btn--solid">
              {isPending ? "Agregando…" : "Enviar acceso"}
            </button>
            {full && (
              <p style={{ margin: 0, fontSize: 13, color: "#ff9a7d", lineHeight: 1.45 }}>
                Tu plan llegó al tope de usuarios. Quita a alguien o sube de plan para agregar más.{" "}
                <Link href="/dashboard/app/configuracion" style={{ color: "#f3efe6", fontWeight: 600 }}>
                  Ver planes ›
                </Link>
              </p>
            )}
            {error && (
              <p role="alert" style={{ margin: 0, fontSize: 13, color: "#ffb39e" }}>
                {error}
              </p>
            )}
          </form>

          <div className="lbd-card lbd-rise lbd-eq-roles" style={{ animationDelay: ".16s" }}>
            <span className="lbd-cm-eyebrow">Qué ve cada rol</span>
            <div className="lbd-eq-role-row">
              <strong>Dueño</strong>
              <span>Todo: pedidos, cocina, mesas, carta, clientes, análisis y configuración.</span>
            </div>
            <div className="lbd-eq-role-row">
              <strong>Mozo</strong>
              <span>Solo la pantalla de comanda. Nunca la administración de la carta ni los reportes.</span>
            </div>
            <span style={{ fontSize: 12, color: "#8a8278", lineHeight: 1.45 }}>Cada mozo inicia sesión con su propio correo y un código.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
