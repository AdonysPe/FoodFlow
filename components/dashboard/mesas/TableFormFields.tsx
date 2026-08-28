"use client";

import {
  TABLE_SHAPES,
  TABLE_ZONES,
  SHAPE_LABELS,
  ZONE_LABELS,
  type TableShapeValue,
  type TableZoneValue,
} from "@/lib/tableMeta";
import { fieldClass, labelClass } from "./ui";

export type TableFormValue = {
  name: string;
  capacity: string;
  shape: TableShapeValue;
  zone: TableZoneValue;
};

export const emptyTableForm: TableFormValue = {
  name: "",
  capacity: "4",
  shape: "round",
  zone: "salon",
};

// The four editable properties of a table — number/name, capacity, shape and
// zone — shared by the "add table" form and the editor's properties panel.
export default function TableFormFields({
  value,
  onChange,
  idPrefix,
}: {
  value: TableFormValue;
  onChange: (next: TableFormValue) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>
          Número o nombre
        </label>
        <input
          id={`${idPrefix}-name`}
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Mesa 4"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-capacity`} className={labelClass}>
          Capacidad
        </label>
        <input
          id={`${idPrefix}-capacity`}
          type="number"
          min="1"
          max="40"
          required
          value={value.capacity}
          onChange={(e) => onChange({ ...value, capacity: e.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-shape`} className={labelClass}>
          Forma
        </label>
        <select
          id={`${idPrefix}-shape`}
          value={value.shape}
          onChange={(e) => onChange({ ...value, shape: e.target.value as TableShapeValue })}
          className={fieldClass}
        >
          {TABLE_SHAPES.map((s) => (
            <option key={s} value={s} className="bg-ink-800">
              {SHAPE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-zone`} className={labelClass}>
          Zona
        </label>
        <select
          id={`${idPrefix}-zone`}
          value={value.zone}
          onChange={(e) => onChange({ ...value, zone: e.target.value as TableZoneValue })}
          className={fieldClass}
        >
          {TABLE_ZONES.map((z) => (
            <option key={z} value={z} className="bg-ink-800">
              {ZONE_LABELS[z]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
