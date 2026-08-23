"use client";

import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { createMenuItem } from "@/lib/actions/menu";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export default function MenuItemForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createMenuItem({ name, price: Number(price), category });
      if (result.ok) {
        setName("");
        setPrice("");
        setCategory("");
        pushToast("Menu item added.", "success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <GlassCard className="p-5 sm:p-6" hoverLift={false}>
      <h2 className="mb-4 text-[15px] font-semibold text-white/90">Add menu item</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="item-name" className="sr-only">
            Name
          </label>
          <input
            id="item-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="item-category" className="sr-only">
            Category
          </label>
          <input
            id="item-category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
        </div>
        <div className="sm:w-32">
          <label htmlFor="item-price" className="sr-only">
            Price
          </label>
          <input
            id="item-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-[14px] text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
        </div>
        <Button type="submit" size="md" className="shrink-0" disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </Button>
      </form>
      {error && <p className="mt-2.5 text-[13px] text-accent-400">{error}</p>}
    </GlassCard>
  );
}
