"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/dashboard/mesas/ConfirmModal";
import { renameRestaurant } from "@/lib/actions/restaurantProfile";
import { RESTAURANT_NAME_MAX, normalizeRestaurantName, restaurantNameSchema } from "@/lib/restaurantName";
import { useDashboardStore } from "@/lib/store/dashboardStore";

/**
 * "Nombre del restaurante" in Configuración. Changing it is a two-step action:
 * type the new name, then confirm it in a dialog that spells out where it will
 * show up — the name is on the public carta and on printed receipts, so it is
 * not something to change by accident. Managers see it read-only.
 */
export default function RestaurantNameCard({
  currentName,
  canEdit,
}: {
  currentName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [draft, setDraft] = useState(currentName);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const parsed = restaurantNameSchema.safeParse(draft);
  const nextName = parsed.success ? parsed.data : null;
  const changed = nextName !== null && nextName !== currentName;
  const hint = !parsed.success && draft.length > 0 ? parsed.error.issues[0]?.message : "";

  function ask(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setError("");
    setConfirming(true);
  }

  function confirm() {
    if (!nextName || isPending) return;
    startTransition(async () => {
      const result = await renameRestaurant({ name: nextName });
      if (!result.ok) {
        setConfirming(false);
        setError(result.error);
        return;
      }
      setConfirming(false);
      setDraft(result.data.name);
      pushToast("Nombre actualizado.", "success");
      router.refresh();
    });
  }

  function cancel() {
    if (isPending) return;
    setConfirming(false);
  }

  return (
    <section className="lbd-card lbd-card--glass lbd-rise lbd-cf-card" style={{ animationDelay: ".05s" }}>
      <span className="lbd-cm-eyebrow">Tu restaurante</span>
      <h2 className="lbd-cf-h">Nombre del restaurante</h2>
      <p className="lbd-cf-p">
        Es el nombre que ven tus clientes en la carta pública, en la web de pedidos y en los comprobantes. La dirección de tu carta y tus códigos QR no cambian.
      </p>

      {canEdit ? (
        <form onSubmit={ask} className="lbd-cf-form">
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <label htmlFor="restaurant-name" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              Nombre del restaurante
            </label>
            <input
              id="restaurant-name"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              maxLength={RESTAURANT_NAME_MAX + 20}
              autoComplete="organization"
              aria-invalid={Boolean(hint || error)}
              aria-describedby="restaurant-name-help"
              className="lbd-input"
            />
            <p id="restaurant-name-help" role={error ? "alert" : undefined} style={{ margin: "6px 0 0", fontSize: 12, color: error || hint ? "#ffb39e" : "#8a8278" }}>
              {error || hint || `${normalizeRestaurantName(draft).length} / ${RESTAURANT_NAME_MAX} caracteres`}
            </p>
          </div>
          <button type="submit" disabled={!changed || isPending} className="lbd-btn lbd-btn--solid">
            Guardar nombre
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, padding: "12px 14px", borderRadius: 14, background: "rgba(243,239,230,0.04)", border: "1px solid rgba(243,239,230,0.09)", fontSize: 15, fontWeight: 600 }}>{currentName}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#8a8278" }}>Solo el dueño de la cuenta puede cambiarlo.</p>
        </div>
      )}

      <ConfirmModal
        open={confirming}
        title="¿Cambiar el nombre del restaurante?"
        message="El cambio se aplica de inmediato y lo verán tus clientes."
        confirmLabel="Sí, cambiar nombre"
        pendingLabel="Guardando…"
        pending={isPending}
        onConfirm={confirm}
        onCancel={cancel}
      >
        <dl className="lbd-cf-diff">
          <div>
            <dt>Antes</dt>
            <dd style={{ textDecoration: "line-through", color: "#8a8278" }}>{currentName}</dd>
          </div>
          <div>
            <dt>Ahora</dt>
            <dd style={{ fontWeight: 650 }}>{nextName}</dd>
          </div>
        </dl>
      </ConfirmModal>
    </section>
  );
}
