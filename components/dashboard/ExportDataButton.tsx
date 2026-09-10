"use client";

import { useDataExport } from "@/lib/hooks/useDataExport";

export default function ExportDataButton() {
  const { download, isExporting, error } = useDataExport();

  return (
    <div className="mb-2 px-2.5">
      <button
        type="button"
        onClick={() => void download()}
        disabled={isExporting}
        className="w-full rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-3 py-2 text-left text-[12.5px] font-medium text-muted transition-colors hover:bg-fg/[0.08] hover:text-fg disabled:cursor-wait disabled:opacity-60"
      >
        {isExporting ? "Generando CSV…" : "Exportar datos (.csv)"}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-accent-label">{error}</p>}
    </div>
  );
}
