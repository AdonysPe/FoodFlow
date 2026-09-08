"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { IconGrip, IconMenuBook } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  toggleMenuItemAvailable,
  duplicateMenuItem,
  deleteMenuItem,
} from "@/lib/actions/menu";
import type { MenuItemDTO } from "@/lib/menuMeta";
import { formatPrice, ghostButtonClass, dangerButtonClass } from "./ui";

function AvailabilityToggle({
  available,
  disabled,
  onToggle,
}: {
  available: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      disabled={disabled}
      onClick={onToggle}
      className="group flex items-center gap-2 disabled:opacity-50"
      title={available ? "Marcar como agotado" : "Marcar como disponible"}
    >
      <span
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 ${
          available ? "bg-ok/80" : "bg-fg/[0.12]"
        }`}
      >
        <span
          className={`absolute top-[2px] left-0 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            available ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      <span
        className={`shrink-0 text-[12.5px] font-medium ${
          available ? "text-ok-ink" : "text-faint"
        }`}
      >
        {available ? "Disponible" : "Agotado"}
      </span>
    </button>
  );
}

export default function MenuItemCard({
  item,
  categoryActive,
  showCategory,
  showGrip = false,
  onEdit,
}: {
  item: MenuItemDTO;
  categoryActive: boolean;
  showCategory: boolean;
  showGrip?: boolean;
  onEdit: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  const hiddenByCategory = item.categoryId != null && !categoryActive;
  const dimmed = !item.available || hiddenByCategory;

  function toggle() {
    startTransition(async () => {
      const result = await toggleMenuItemAvailable(item.id);
      pushToast(
        result.ok
          ? result.data.available
            ? `${item.name} vuelve a estar disponible.`
            : `${item.name} marcado como agotado.`
          : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateMenuItem(item.id);
      pushToast(result.ok ? "Plato duplicado." : result.error, result.ok ? "success" : "error");
    });
  }

  function remove() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteMenuItem(item.id);
      pushToast(result.ok ? "Plato eliminado." : result.error, result.ok ? "success" : "error");
      setConfirmingDelete(false);
    });
  }

  return (
    <div className="flex h-full gap-3 rounded-xl border border-fg/[0.07] bg-fg/[0.02] p-3.5">
      {showGrip && (
        <span
          aria-hidden
          className="mt-0.5 shrink-0 self-start text-faint"
          title="Arrastra para reordenar"
        >
          <IconGrip className="h-4 w-4" />
        </span>
      )}

      {/* The same tile either way, so a carta with some photos and some gaps
          still lines up. The book icon is what a diner would see missing. */}
      {item.photoUrl ? (
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-fg/[0.06] bg-fg/[0.03]">
          <Image
            src={item.photoUrl}
            alt=""
            fill
            sizes="56px"
            className={`object-cover ${dimmed ? "grayscale opacity-70" : ""}`}
          />
        </span>
      ) : (
        <div
          aria-hidden
          title="Sin foto: no aparecerá con imagen en tu carta pública"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-dashed border-fg/[0.12] bg-fg/[0.03] text-fg/20"
        >
          <IconMenuBook className="h-6 w-6" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`truncate text-[14px] font-medium ${dimmed ? "text-faint" : "text-fg/85"}`}>
              {item.name}
            </p>
            <p className="mt-0.5 text-[12.5px] text-faint">
              {formatPrice(item.price)}
              {item.prepMin != null ? ` · ${item.prepMin} min` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {showCategory && (
              <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[11px] text-faint">
                {item.categoryName ?? "Sin categoría"}
              </span>
            )}
            {hiddenByCategory && (
              <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[11px] text-faint">
                categoría oculta
              </span>
            )}
          </div>
        </div>

        {item.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-faint">
            {item.description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2.5 pt-3">
          <AvailabilityToggle available={item.available} disabled={isPending} onToggle={toggle} />
          <div className="flex flex-wrap gap-1.5 border-t border-fg/[0.05] pt-2.5">
            <button type="button" onClick={onEdit} className={ghostButtonClass}>
              Editar
            </button>
            <button type="button" disabled={isPending} onClick={duplicate} className={ghostButtonClass}>
              Duplicar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={remove}
              onBlur={() => setConfirmingDelete(false)}
              className={confirmingDelete ? dangerButtonClass : ghostButtonClass}
            >
              {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
