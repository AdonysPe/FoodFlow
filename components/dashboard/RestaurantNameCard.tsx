"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
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
    <GlassCard className="p-5 sm:p-6" hoverLift={false}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Tu restaurante</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-fg">Nombre del restaurante</h3>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-faint">
        Es el nombre que ven tus clientes en la carta pública, en la web de pedidos y en los
        comprobantes. La dirección de tu carta y tus códigos QR no cambian.
      </p>

      {canEdit ? (
        <form onSubmit={ask} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <label htmlFor="restaurant-name" className="sr-only">
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
              className="h-11 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-3.5 text-[14px] text-fg outline-none transition-colors placeholder:text-faint focus:border-accent-500/60 focus:bg-fg/[0.06]"
            />
            <p
              id="restaurant-name-help"
              role={error ? "alert" : undefined}
              className={`mt-1.5 text-[11.5px] ${error || hint ? "text-accent-label" : "text-faint"}`}
            >
              {error || hint || `${normalizeRestaurantName(draft).length} / ${RESTAURANT_NAME_MAX} caracteres`}
            </p>
          </div>
          <button
            type="submit"
            disabled={!changed || isPending}
            className="h-11 shrink-0 rounded-xl bg-accent-500 px-5 text-[13.5px] font-semibold text-fg transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar nombre
          </button>
        </form>
      ) : (
        <div className="mt-5 max-w-xl">
          <p className="rounded-xl border border-fg/[0.09] bg-fg/[0.025] px-3.5 py-3 text-[14px] font-medium text-fg/85">
            {currentName}
          </p>
          <p className="mt-2 text-[12px] text-faint">Solo el dueño de la cuenta puede cambiarlo.</p>
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
        <dl className="mt-4 space-y-2 rounded-xl border border-fg/[0.09] bg-fg/[0.03] p-3.5 text-[13px]">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-faint">Antes</dt>
            <dd className="min-w-0 break-words text-muted line-through decoration-fg/30">{currentName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-faint">Ahora</dt>
            <dd className="min-w-0 break-words font-semibold text-fg">{nextName}</dd>
          </div>
        </dl>
      </ConfirmModal>
    </GlassCard>
  );
}
