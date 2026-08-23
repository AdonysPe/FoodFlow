"use client";

import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { updateRestaurant, deleteRestaurant } from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type RestaurantRow = {
  id: string;
  name: string;
  ownerEmail: string;
  createdAtLabel: string;
};

const inputClass =
  "h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 text-[13.5px] text-white outline-none focus:border-accent-400/50";

function RestaurantRowItem({ restaurant }: { restaurant: RestaurantRow }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [ownerEmail, setOwnerEmail] = useState(restaurant.ownerEmail);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSave() {
    startTransition(async () => {
      const result = await updateRestaurant(restaurant.id, { name, ownerEmail });
      if (result.ok) {
        setEditing(false);
        pushToast("Restaurant updated.", "success");
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
      const result = await deleteRestaurant(restaurant.id);
      pushToast(
        result.ok ? `${restaurant.name} deleted.` : result.error,
        result.ok ? "success" : "error"
      );
      setConfirmingDelete(false);
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
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className={inputClass}
          />
        </td>
        <td className="px-5 py-3 text-white/45">{restaurant.createdAtLabel}</td>
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
              onClick={() => {
                setName(restaurant.name);
                setOwnerEmail(restaurant.ownerEmail);
                setEditing(false);
              }}
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
      <td className="px-5 py-3.5 font-medium text-white/85">{restaurant.name}</td>
      <td className="px-5 py-3.5 text-white/55">{restaurant.ownerEmail}</td>
      <td className="px-5 py-3.5 text-white/45">{restaurant.createdAtLabel}</td>
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
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-40 ${
              confirmingDelete
                ? "bg-accent-500 text-white hover:bg-accent-600"
                : "border border-white/[0.1] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {confirmingDelete ? "Confirm delete?" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function RestaurantsTable({ restaurants }: { restaurants: RestaurantRow[] }) {
  if (restaurants.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No restaurants yet. Create the first one to get started.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Name</th>
              <th className="px-5 py-3.5 font-medium">Owner</th>
              <th className="px-5 py-3.5 font-medium">Created</th>
              <th className="px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <RestaurantRowItem key={r.id} restaurant={r} />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
