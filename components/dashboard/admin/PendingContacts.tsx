"use client";

import { useOptimistic, useTransition } from "react";
import { updateLeadPipeline } from "@/lib/actions/leadCapture";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type PendingContact = {
  id: string;
  nombre: string;
  restaurante: string;
  whatsapp: string;
  source: string;
  perdidaAnualLabel: string | null;
  createdAt: string;
};

const AVATARS = [
  { bg: "#ff5a33", fg: "#0c0908" },
  { bg: "#f3efe6", fg: "#0c0908" },
  { bg: "#3a302b", fg: "#f3efe6" },
];

function ageOf(iso: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return { hours, label: hours < 1 ? "hace un momento" : hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d` };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * "Por atender": the contacts nobody has written to yet, oldest first, with
 * WhatsApp one tap away and a button that moves them to Contactados. The
 * promise on the site is an answer within 24 hours, so anything older than
 * that is drawn in vermilion.
 */
export default function PendingContacts({ contacts }: { contacts: PendingContact[] }) {
  const [, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [shown, remove] = useOptimistic(contacts, (state, id: string) => state.filter((c) => c.id !== id));

  function done(id: string) {
    startTransition(async () => {
      remove(id);
      const result = await updateLeadPipeline(id, "contactado");
      pushToast(result.ok ? "Contacto marcado como contactado." : result.error, result.ok ? "success" : "error");
    });
  }

  if (shown.length === 0) {
    return <div className="lbd-ad-done lbd-swap">Todo al día. Nadie espera respuesta.</div>;
  }

  return (
    <>
      {shown.map((contact, index) => {
        const age = ageOf(contact.createdAt);
        const late = age.hours >= 24;
        const avatar = AVATARS[index % AVATARS.length];
        return (
          <div key={contact.id} className={`lbd-ad-pend${late ? " is-late" : ""}`}>
            <span className="lbd-cu-av lbd-ad-av" style={{ background: avatar.bg, color: avatar.fg }}>
              {initials(contact.nombre)}
            </span>
            <div className="lbd-ad-pend-main">
              <span className="lbd-ad-pend-name">
                {contact.nombre} <span>· {contact.restaurante}</span>
              </span>
              <span className="lbd-ad-pend-sub">
                {contact.source}
                {contact.perdidaAnualLabel ? ` · pierde ~${contact.perdidaAnualLabel} al año en comisiones` : ""}
              </span>
            </div>
            <span className="lbd-ad-age" data-late={late}>
              {age.label}
            </span>
            <div className="lbd-ad-pend-actions">
              <a href={`https://wa.me/51${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="lbd-ad-wa">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" />
                </svg>
                WhatsApp
              </a>
              <button type="button" className="lbd-btn lbd-btn--ghost lbd-btn--sm" onClick={() => done(contact.id)}>
                Ya lo contacté
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
