"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconX } from "@/components/ui/Icons";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { updateTable, deleteTable } from "@/lib/actions/tables";
import type { TableDTO } from "./types";
import TableFormFields, { type TableFormValue } from "./TableFormFields";
import ConfirmModal from "./ConfirmModal";
import { accentButtonClass, ghostButtonClass } from "./ui";

function toForm(t: TableDTO): TableFormValue {
  return { name: t.name, capacity: String(t.capacity), shape: t.shape, zone: t.zone };
}

// Edit-mode side panel: the four table properties plus delete. Position edits
// happen by dragging on the canvas, not here.
export default function TablePropertiesPanel({
  table,
  onClose,
  onDeleted,
}: {
  table: TableDTO | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<TableFormValue | null>(table ? toForm(table) : null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  // Re-seed the form only when a different table is selected — not on every
  // background refresh, which would wipe in-progress edits and close the
  // delete dialog.
  const tableId = table?.id ?? null;
  useEffect(() => {
    setForm(table ? toForm(table) : null);
    setConfirmingDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  function handleSave() {
    if (!table || !form) return;
    startTransition(async () => {
      const result = await updateTable(table.id, {
        name: form.name,
        capacity: Number(form.capacity),
        shape: form.shape,
        zone: form.zone,
      });
      pushToast(result.ok ? "Mesa actualizada." : result.error, result.ok ? "success" : "error");
    });
  }

  function handleDelete() {
    if (!table) return;
    startTransition(async () => {
      const result = await deleteTable(table.id);
      if (result.ok) {
        pushToast(`${table.name} eliminada.`, "success");
        setConfirmingDelete(false);
        onDeleted();
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  return (
    <>
      <AnimatePresence>
        {table && form && (
          <motion.aside
            key={table.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-white/[0.08] bg-ink-950"
            role="dialog"
            aria-label={`Editar ${table.name}`}
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-white">
                Editar mesa
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
              >
                <IconX className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <TableFormFields value={form} onChange={setForm} idPrefix={`props-${table.id}`} />
              <p className="mt-4 text-[12px] text-white/35">
                Arrastra la mesa en el plano para moverla. La posición se guarda sola.
              </p>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={isPending}
                className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-[12.5px] font-medium text-accent-300 hover:bg-accent-500/20 disabled:opacity-40"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className={accentButtonClass}
              >
                {isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={confirmingDelete}
        title={table ? `Eliminar ${table.name}` : "Eliminar mesa"}
        message="Se quitará del plano. Las reservas de esta mesa se conservan pero quedan sin mesa asignada."
        pending={isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
