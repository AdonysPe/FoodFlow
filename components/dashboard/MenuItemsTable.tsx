"use client";

import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { updateMenuItem, toggleMenuItemActive } from "@/lib/actions/menu";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { formatCurrency } from "@/lib/format";

export type MenuItemRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
};

const inputClass =
  "h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-[13.5px] text-white outline-none focus:border-accent-400/50";

function EditableRow({ item }: { item: MenuItemRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [category, setCategory] = useState(item.category);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSave() {
    startTransition(async () => {
      const result = await updateMenuItem(item.id, { name, price: Number(price), category });
      if (result.ok) {
        setEditing(false);
        pushToast("Menu item updated.", "success");
      } else {
        pushToast(result.error, "error");
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleMenuItemActive(item.id);
      pushToast(
        result.ok
          ? `${item.name} marked as ${item.isActive ? "inactive" : "active"}.`
          : result.error,
        result.ok ? "success" : "error"
      );
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-white/[0.04] last:border-0">
        <td className="px-5 py-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </td>
        <td className="px-5 py-3">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          />
        </td>
        <td className="px-5 py-3">
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${inputClass} w-24`}
          />
        </td>
        <td className="px-5 py-3" />
        <td className="px-5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="rounded-lg bg-linear-to-b from-accent-400 to-accent-600 px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="px-5 py-3.5 font-medium text-white/85">{item.name}</td>
      <td className="px-5 py-3.5 text-white/55">{item.category}</td>
      <td className="px-5 py-3.5 text-white/70">{formatCurrency(item.price)}</td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${
            item.isActive
              ? "bg-mint/10 text-mint ring-mint/25"
              : "bg-white/[0.06] text-white/50 ring-white/15"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {item.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggle}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
          >
            {item.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function MenuItemsTable({ items }: { items: MenuItemRow[] }) {
  if (items.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No menu items yet. Add your first item above.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Name</th>
              <th className="px-5 py-3.5 font-medium">Category</th>
              <th className="px-5 py-3.5 font-medium">Price</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <EditableRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
