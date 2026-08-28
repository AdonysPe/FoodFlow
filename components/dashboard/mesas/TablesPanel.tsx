"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { createTable, updateTable, deleteTable } from "@/lib/actions/tables";
import { SHAPE_LABELS, ZONE_LABELS } from "@/lib/tableMeta";
import type { TableDTO } from "./types";
import TableFormFields, { emptyTableForm, type TableFormValue } from "./TableFormFields";
import { ghostButtonClass, accentButtonClass } from "./ui";

function toForm(t: TableDTO): TableFormValue {
  return { name: t.name, capacity: String(t.capacity), shape: t.shape, zone: t.zone };
}

function TableRow({ table }: { table: TableDTO }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TableFormValue>(toForm(table));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSave() {
    startTransition(async () => {
      const result = await updateTable(table.id, {
        name: form.name,
        capacity: Number(form.capacity),
        shape: form.shape,
        zone: form.zone,
      });
      if (result.ok) {
        setEditing(false);
        pushToast("Mesa actualizada.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteTable(table.id);
      pushToast(result.ok ? `${table.name} eliminada.` : result.error, result.ok ? "success" : "error");
      setConfirmingDelete(false);
    });
  }

  return (
    <li className="border-b border-white/[0.05] px-5 py-4 last:border-0">
      {editing ? (
        <div className="flex flex-col gap-4">
          <TableFormFields value={form} onChange={setForm} idPrefix={`edit-${table.id}`} />
          <div className="flex gap-2">
            <button type="button" disabled={isPending} onClick={handleSave} className={accentButtonClass}>
              Guardar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setForm(toForm(table));
                setEditing(false);
              }}
              className={ghostButtonClass}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-white/85">{table.name}</p>
            <p className="mt-0.5 text-[12.5px] text-white/45">
              {table.capacity} personas · {SHAPE_LABELS[table.shape]} · {ZONE_LABELS[table.zone]}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className={ghostButtonClass}>
              Editar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              className={
                confirmingDelete
                  ? "rounded-lg bg-accent-500 px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-40"
                  : ghostButtonClass
              }
            >
              {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function TablesPanel({ tables }: { tables: TableDTO[] }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<TableFormValue>(emptyTableForm);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createTable({
        name: form.name,
        capacity: Number(form.capacity),
        shape: form.shape,
        zone: form.zone,
      });
      if (result.ok) {
        setForm(emptyTableForm);
        setAdding(false);
        pushToast("Mesa añadida.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-white/90">Mesas del local</h2>
          <p className="mt-0.5 text-[12.5px] text-white/40">
            {tables.length} {tables.length === 1 ? "mesa" : "mesas"} en el plano
          </p>
        </div>
        <Button
          type="button"
          size="md"
          variant={adding ? "secondary" : "primary"}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Cerrar" : "+ Añadir mesa"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <GlassCard className="p-5 sm:p-6" hoverLift={false}>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <TableFormFields value={form} onChange={setForm} idPrefix="new" />
                <div>
                  <Button type="submit" size="md" disabled={isPending}>
                    {isPending ? "Añadiendo…" : "Añadir mesa"}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {tables.length === 0 ? (
        <GlassCard className="p-10 text-center" hoverLift={false}>
          <p className="text-[14px] text-white/45">Aún no hay mesas. Crea tu plano para empezar.</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden p-0" hoverLift={false}>
          <ul className="flex flex-col">
            {tables.map((t) => (
              <TableRow key={t.id} table={t} />
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
