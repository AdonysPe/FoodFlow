"use client";

import { forwardRef } from "react";
import type { TableStateValue } from "@/lib/tableMeta";
import type { TableDTO } from "./types";

const SIZE: Record<TableDTO["shape"], string> = {
  round: "w-[clamp(64px,13cqi,128px)] aspect-square rounded-full",
  square: "w-[clamp(64px,13cqi,128px)] aspect-square rounded-[26%]",
  rect: "w-[clamp(108px,22cqi,196px)] aspect-[7/4] rounded-[18%]",
};

/**
 * What a table looks like on the plan, as the prototype draws it: an outline
 * when it is free, solid cream when it is taken, vermilion when its account is
 * waiting to be charged, and a dashed vermilion edge when a reservation holds
 * it. `bill` is a taken table whose order was served and not yet paid.
 */
export type TableLook = TableStateValue | "cuenta";

// One table on the plan. Absolutely positioned by the parent via percentage
// left/top; the figure is centered on that point.
const TableFigure = forwardRef<
  HTMLButtonElement,
  {
    table: TableDTO;
    state: TableStateValue;
    bill?: boolean;
    selected?: boolean;
    editing?: boolean;
    dragging?: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onClick?: () => void;
    style?: React.CSSProperties;
  }
>(function TableFigure(
  { table, state, bill, selected, editing, dragging, onPointerDown, onPointerMove, onPointerUp, onClick, style },
  ref
) {
  const look: TableLook = bill && state === "ocupada" ? "cuenta" : state;
  const label = { libre: "libre", ocupada: "ocupada", reservada: "reservada", cuenta: "por cobrar" }[look];

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${table.name}, ${label}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{ left: `${table.x}%`, top: `${table.y}%`, ...style }}
      data-look={look}
      className={`lbd-fig absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center ${SIZE[table.shape]} ${
        editing ? "is-editing cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragging ? "is-dragging z-20" : ""} ${selected ? "is-selected" : ""}`}
    >
      <span className="lbd-fig-name">{table.name}</span>
      <span className="lbd-fig-seats">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
        {table.capacity}
      </span>
    </button>
  );
});

export default TableFigure;
