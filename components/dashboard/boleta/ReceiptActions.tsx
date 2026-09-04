"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/**
 * The chrome around the paper — none of it prints.
 *
 * `auto` is set when the waiter arrives straight from charging, so the print
 * dialog is already open by the time they look at the screen. It fires once
 * per mount, guarded by a ref: React runs effects twice in dev and a second
 * dialog on a busy till is worse than no dialog at all.
 */
export default function ReceiptActions({
  auto,
  label,
  backHref,
  backLabel,
}: {
  auto: boolean;
  label: string;
  backHref: string;
  backLabel: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (!auto || fired.current) return;
    fired.current = true;
    // One frame so the paper is laid out before the dialog snapshots it.
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [auto]);

  return (
    <div className="no-print flex w-full max-w-[380px] flex-col gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="h-12 w-full rounded-xl bg-linear-to-b from-accent-400 to-accent-600 text-[15px] font-bold text-on-accent transition-opacity active:scale-[0.98]"
      >
        {label}
      </button>
      <Link
        href={backHref}
        className="flex h-11 w-full items-center justify-center rounded-xl border border-fg/[0.12] bg-fg/[0.04] text-[14px] font-medium text-fg/70 hover:bg-fg/[0.08] hover:text-fg"
      >
        {backLabel}
      </Link>
    </div>
  );
}
