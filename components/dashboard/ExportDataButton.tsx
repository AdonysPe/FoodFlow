"use client";

import { useDataExport } from "@/lib/hooks/useDataExport";

export default function ExportDataButton({ className }: { className?: string }) {
  const { download, isExporting, error } = useDataExport();

  return (
    <div className={className}>
      <button type="button" onClick={() => void download()} disabled={isExporting} className="lbd-btn lbd-btn--ghost lbd-btn--sm" style={{ cursor: isExporting ? "wait" : undefined }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 8 }}>
          <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
        </svg>
        {isExporting ? "Generando CSV…" : "Exportar datos (.csv)"}
      </button>
      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#ffb39e" }}>
          {error}
        </p>
      )}
    </div>
  );
}
