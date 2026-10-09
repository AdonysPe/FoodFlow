"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { toggleMenuItemAvailable } from "@/lib/actions/menu";
import type { MenuItemDTO } from "@/lib/menuMeta";
import { formatPrice } from "./ui";

/**
 * One dish of the carta, design B. As a card (the grid) it is a photo, the
 * name and price, and the availability switch; as a row (while ordering a
 * category by dragging) it shrinks to the same facts on one line. Pressing it
 * opens the dish in the editor beside the grid.
 */
export default function MenuItemCard({
  item,
  categoryActive,
  showCategory,
  selected = false,
  layout = "card",
  onEdit,
}: {
  item: MenuItemDTO;
  categoryActive: boolean;
  showCategory: boolean;
  selected?: boolean;
  layout?: "card" | "row";
  onEdit: () => void;
}) {
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

  const photo = item.photoUrl ? (
    <Image src={item.photoUrl} alt="" fill sizes={layout === "row" ? "56px" : "240px"} className={`lbd-me-img${dimmed ? " is-dim" : ""}`} />
  ) : (
    <span className="lbd-me-noimg" aria-hidden title="Sin foto: no aparecerá con imagen en tu carta pública">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5" />
      </svg>
      {layout === "card" && "Sin foto"}
    </span>
  );

  const toggleSwitch = (
    <button type="button" role="switch" aria-checked={item.available} disabled={isPending} onClick={toggle} className="lbd-me-switch" style={{ color: item.available ? "#cfc7bb" : "#ff7a57" }} title={item.available ? "Marcar como agotado" : "Marcar como disponible"}>
      <span>{item.available ? "Disponible" : "Agotado hoy"}</span>
      <i className={item.available ? "is-on" : undefined}>
        <b />
      </i>
    </button>
  );

  if (layout === "row") {
    return (
      <div className={`lbd-me-row${selected ? " is-on" : ""}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ color: "#8a8278", flexShrink: 0 }}>
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
        <button type="button" onClick={onEdit} className="lbd-me-row-main" aria-label={`Editar ${item.name}`}>
          <span className="lbd-me-thumb">{photo}</span>
          <span style={{ minWidth: 0, textAlign: "left" }}>
            <span className="lbd-trunc" style={{ display: "block", fontSize: 14, fontWeight: 600, color: dimmed ? "#8a8278" : "#f3efe6" }}>
              {item.name}
            </span>
            <span style={{ fontSize: 12.5, color: "#a39b90" }}>{formatPrice(item.price)}</span>
          </span>
        </button>
        {toggleSwitch}
      </div>
    );
  }

  return (
    <article className={`lbd-me-card${selected ? " is-on" : ""}`}>
      <button type="button" onClick={onEdit} aria-label={`Editar ${item.name}`} className="lbd-me-card-img">
        {photo}
        {!item.available && <span className="lbd-me-flag">Agotado</span>}
        {hiddenByCategory && <span className="lbd-me-flag" style={{ left: "auto", right: 10 }}>Categoría oculta</span>}
      </button>
      <div className="lbd-me-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: dimmed ? "#a39b90" : "#f3efe6" }}>{item.name}</span>
          <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{formatPrice(item.price)}</span>
        </div>
        {(showCategory || item.prepMin != null) && (
          <span style={{ fontSize: 12, color: "#8a8278" }}>
            {showCategory ? item.categoryName ?? "Sin categoría" : ""}
            {showCategory && item.prepMin != null ? " · " : ""}
            {item.prepMin != null ? `${item.prepMin} min` : ""}
          </span>
        )}
        {toggleSwitch}
      </div>
    </article>
  );
}
