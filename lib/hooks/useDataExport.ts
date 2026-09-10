"use client";

import { useCallback, useState } from "react";

function responseFilename(header: string | null): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? "foodflow-export.csv";
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/export", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo generar la exportación.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = responseFilename(response.headers.get("content-disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo exportar.");
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { download, isExporting, error };
}
