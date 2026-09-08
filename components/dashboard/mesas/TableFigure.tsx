"use client";

import { forwardRef } from "react";
import { TABLE_STATE_TONE, type TableStateValue } from "@/lib/tableMeta";
import type { TableDTO } from "./types";

const SIZE: Record<TableDTO["shape"], string> = {
  round: "w-[clamp(48px,14cqi,90px)] aspect-square rounded-full",
  square: "w-[clamp(48px,14cqi,90px)] aspect-square rounded-[30%]",
  rect: "w-[clamp(74px,22cqi,134px)] aspect-[7/4] rounded-[18%]",
};

// One table on the plan. Absolutely positioned by the parent via percentage
// left/top; the figure is centered on that point. Styling leans Apple:
// a soft translucent fill with a crisp state-coloured edge, a gentle drop
// shadow for depth, and a small solid status dot for anything not "libre".
const TableFigure = forwardRef<
  HTMLButtonElement,
  {
    table: TableDTO;
    state: TableStateValue;
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
  {
    table,
    state,
    selected,
    editing,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
    style,
  },
  ref
) {
  const tone = TABLE_STATE_TONE[state];

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        borderColor: tone.stroke,
        backgroundColor: tone.fill,
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0) 55%)",
        color: tone.text,
        boxShadow: dragging
          ? `0 20px 44px -12px var(--drop-hard), 0 0 0 1px ${tone.stroke}, 0 0 26px -4px ${tone.solid}`
          : state === "libre"
            ? "0 8px 20px -12px var(--drop-soft), inset 0 1px 0 0 var(--spec)"
            : `0 8px 20px -12px var(--drop-soft), inset 0 1px 0 0 var(--spec), 0 0 18px -8px ${tone.solid}`,
        ...style,
      }}
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border backdrop-blur-[3px] transition-[transform,box-shadow] duration-200 ${
        SIZE[table.shape]
      } ${editing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
        dragging ? "z-20 scale-[1.04]" : "hover:scale-[1.02]"
      } ${
        selected
          ? "outline outline-2 outline-offset-[3px] outline-fg/80"
          : "outline outline-1 -outline-offset-1 outline-fg/10"
      }`}
    >
      <span className="px-1 text-center text-[clamp(9.5px,3cqi,13px)] font-semibold leading-tight tracking-[-0.01em] text-fg">
        {table.name}
      </span>
      <span className="mt-0.5 flex items-center gap-0.5 text-[clamp(7.5px,2.2cqi,10px)] font-medium tabular-nums text-muted">
        <svg viewBox="0 0 24 24" className="h-[1em] w-[1em]" fill="currentColor" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
        {table.capacity}
      </span>
      {state !== "libre" && (
        <span
          aria-hidden
          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-950 ${
            state === "ocupada" ? "animate-pulse-slow" : ""
          }`}
          style={{ backgroundColor: tone.solid }}
        />
      )}
    </button>
  );
});

export default TableFigure;
