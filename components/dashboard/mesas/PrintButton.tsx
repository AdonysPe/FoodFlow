"use client";

/** The one line of browser API the QR sheet needs; everything else stays server-rendered. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3.5 py-2 text-[13px] font-semibold text-on-accent transition-opacity hover:opacity-90"
    >
      Imprimir
    </button>
  );
}
