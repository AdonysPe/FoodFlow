"use client";

import { useState, useTransition } from "react";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { createTable, updateTable, deleteTable } from "@/lib/actions/tables";
import { SHAPE_LABELS, TABLE_SHAPES, TABLE_ZONES, ZONE_LABELS, type TableShapeValue, type TableZoneValue } from "@/lib/tableMeta";
import type { TableDTO } from "./types";
import { emptyTableForm, type TableFormValue } from "./TableFormFields";

function toForm(t: TableDTO): TableFormValue {
  return { name: t.name, capacity: String(t.capacity), shape: t.shape, zone: t.zone };
}

/** The table's outline, drawn to its shape, with the seat count inside. */
function ShapeGlyph({ shape, seats }: { shape: TableShapeValue; seats: number }) {
  return (
    <span className="lbd-ms-glyph" aria-hidden="true">
      <span data-shape={shape}>{seats}</span>
    </span>
  );
}

/** Pick one of a few values as a row of pills — shape and zone. */
function Pick<T extends string>({ label, options, labels, value, onChange }: { label: string; options: readonly T[]; labels: Record<T, string>; value: T; onChange: (next: T) => void }) {
  return (
    <div className="lbd-ms-field lbd-ms-field--wide">
      <span>{label}</span>
      <div className="lbd-ms-pick" role="group" aria-label={label}>
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={value === option} className={value === option ? "is-on" : undefined} onClick={() => onChange(option)}>
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
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
    <li className="lbd-ms-row">
      <ShapeGlyph shape={editing ? form.shape : table.shape} seats={editing ? Number(form.capacity) || 0 : table.capacity} />
      {editing ? (
        <div className="lbd-ms-edit">
          <label className="lbd-ms-field">
            <span>Nombre</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mesa 4" required autoFocus />
          </label>
          <label className="lbd-ms-field lbd-ms-field--small">
            <span>Personas</span>
            <input type="number" min="1" max="40" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          </label>
          <Pick label="Forma" options={TABLE_SHAPES} labels={SHAPE_LABELS} value={form.shape} onChange={(shape) => setForm({ ...form, shape })} />
          <Pick label="Zona" options={TABLE_ZONES} labels={ZONE_LABELS} value={form.zone} onChange={(zone) => setForm({ ...form, zone })} />
          <div className="lbd-ms-edit-actions">
            <button type="button" disabled={isPending} onClick={handleSave} className="lbd-btn lbd-btn--solid lbd-btn--sm">
              {isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setForm(toForm(table));
                setEditing(false);
              }}
              className="lbd-btn lbd-btn--ghost lbd-btn--sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="lbd-ms-row-main">
            <strong>{table.name}</strong>
            <small>
              {table.capacity} {table.capacity === 1 ? "persona" : "personas"} · {SHAPE_LABELS[table.shape]} · {ZONE_LABELS[table.zone]}
            </small>
          </div>
          <div className="lbd-ms-row-actions">
            <button type="button" onClick={() => setEditing(true)} className="lbd-btn lbd-btn--ghost lbd-btn--sm">
              Editar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
              className={`lbd-btn lbd-btn--sm ${confirmingDelete ? "lbd-btn--solid" : "lbd-btn--ghost"}`}
            >
              {confirmingDelete ? "¿Confirmar?" : "Eliminar"}
            </button>
          </div>
        </>
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
        setForm({ ...emptyTableForm, zone: form.zone });
        setAdding(false);
        pushToast("Mesa añadida.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  const seats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const zones = TABLE_ZONES.map((zone) => ({ zone, rows: tables.filter((t) => t.zone === zone) })).filter((group) => group.rows.length > 0);
  const stats = [
    { label: "Mesas", value: tables.length, sub: "activas" },
    { label: "Asientos", value: seats, sub: "en total" },
    ...zones.map(({ zone, rows }) => ({ label: ZONE_LABELS[zone as TableZoneValue], value: rows.length, sub: rows.length === 1 ? "mesa" : "mesas" })),
  ];

  return (
    <div className="lbd-pg">
      <div className="lbd-ms-stats lbd-rise" style={{ animationDelay: ".05s" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="lbd-ms-stat lbd-ms-stat--count">
            <span>{stat.label}</span>
            <span>
              <strong className="lbd-display">{stat.value}</strong>
              <small>{stat.sub}</small>
            </span>
          </div>
        ))}
      </div>

      <section className="lbd-card lbd-ms-list lbd-rise" style={{ animationDelay: ".1s" }} aria-label="Mesas del local">
        <div className="lbd-ms-list-head">
          <div>
            <strong>Mesas del local</strong>
            <small>
              {tables.length} {tables.length === 1 ? "mesa" : "mesas"} en el plano
            </small>
          </div>
          <button type="button" aria-expanded={adding} onClick={() => setAdding((v) => !v)} className={`lbd-btn lbd-btn--sm ${adding ? "lbd-btn--ghost" : "lbd-btn--solid"}`}>
            {adding ? "Cerrar" : "+ Añadir mesa"}
          </button>
        </div>

        {adding && (
          <form onSubmit={handleCreate} className="lbd-ms-add">
            <label className="lbd-ms-field">
              <span>Nombre</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mesa 4" required autoFocus />
            </label>
            <label className="lbd-ms-field lbd-ms-field--small">
              <span>Personas</span>
              <input type="number" min="1" max="40" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            </label>
            <Pick label="Forma" options={TABLE_SHAPES} labels={SHAPE_LABELS} value={form.shape} onChange={(shape) => setForm({ ...form, shape })} />
            <Pick label="Zona" options={TABLE_ZONES} labels={ZONE_LABELS} value={form.zone} onChange={(zone) => setForm({ ...form, zone })} />
            <button type="submit" disabled={isPending} className="lbd-btn lbd-btn--solid lbd-btn--sm lbd-ms-add-go">
              {isPending ? "Añadiendo…" : "Añadir mesa"}
            </button>
          </form>
        )}

        {tables.length === 0 ? (
          <p className="lbd-ms-empty">Aún no hay mesas. Crea tu plano para empezar.</p>
        ) : (
          zones.map(({ zone, rows }) => (
            <div key={zone}>
              <span className="lbd-ms-group lbd-mono">
                {ZONE_LABELS[zone as TableZoneValue].toUpperCase()} · {rows.length} {rows.length === 1 ? "MESA" : "MESAS"}
              </span>
              <ul className="lbd-ms-rows">
                {rows.map((t) => (
                  <TableRow key={t.id} table={t} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
