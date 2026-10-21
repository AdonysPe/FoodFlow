"use client";

/** The one line of browser API the QR sheet needs; everything else stays server-rendered. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="lbd-btn lbd-btn--solid lbd-qr-print"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z" />
      </svg>
      Imprimir hoja
    </button>
  );
}
