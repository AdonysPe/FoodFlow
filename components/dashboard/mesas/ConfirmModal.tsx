"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Centered confirmation dialog, design B. Used for the actions that should not
 * happen by accident: deleting a table, renaming the restaurant. It mounts on
 * the panel root (`.lbd`) so an animated ancestor cannot trap it behind the
 * rows below, and closes on Escape or on a click outside.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  pendingLabel = "Eliminando…",
  pending = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra detail shown between the message and the buttons. */
  children?: ReactNode;
}) {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    setHost(document.querySelector(".lbd") ?? document.body);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !host) return null;

  return createPortal(
    <div className="lbd-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="lbd-modal-card lbd-pop" role="dialog" aria-modal="true" aria-label={title} style={{ width: "min(420px, 100%)" }}>
        <h2 className="lbd-display" style={{ margin: 0, fontSize: 24, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#a39b90" }}>{message}</p>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={pending} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className="lbd-btn lbd-btn--solid lbd-btn--sm" style={{ fontSize: 13 }}>
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    host
  );
}
