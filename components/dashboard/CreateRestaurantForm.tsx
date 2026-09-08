"use client";

import { useState, useTransition } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { createRestaurant } from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import {
  PLANS,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_SUMMARIES,
  type PlanValue,
} from "@/lib/plans";

export default function CreateRestaurantForm() {
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  // Defaults to the plan the pricing page calls "Más elegido".
  const [plan, setPlan] = useState<PlanValue>("servicio");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pushToast = useDashboardStore((s) => s.pushToast);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createRestaurant({ name, ownerEmail, plan });
      if (result.ok) {
        setName("");
        setOwnerEmail("");
        setPlan("servicio");
        pushToast("Restaurant created.", "success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <GlassCard className="p-5 sm:p-6" hoverLift={false}>
      <h2 className="mb-4 text-[15px] font-semibold text-fg/90">Create restaurant</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="restaurant-name" className="sr-only">
            Restaurant name
          </label>
          <input
            id="restaurant-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Restaurant name"
            className="h-11 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[14px] text-fg placeholder:text-faint outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-fg/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="owner-email" className="sr-only">
            Owner email
          </label>
          <input
            id="owner-email"
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Owner email"
            className="h-11 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[14px] text-fg placeholder:text-faint outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-fg/[0.06] focus:ring-4 focus:ring-accent-400/10"
          />
        </div>
        <div className="sm:w-44">
          <label htmlFor="restaurant-plan" className="sr-only">
            Plan
          </label>
          <select
            id="restaurant-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanValue)}
            className="h-11 w-full rounded-xl border border-fg/[0.1] bg-fg/[0.04] px-4 text-[14px] text-fg outline-none transition-all duration-200 focus:border-accent-400/50 focus:bg-fg/[0.06] focus:ring-4 focus:ring-accent-400/10"
          >
            {PLANS.map((p) => (
              <option key={p} value={p} className="bg-ink-900">
                {PLAN_LABELS[p]} · {PLAN_PRICES[p]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="md" className="shrink-0" disabled={isPending}>
          {isPending ? "Creating…" : "Create"}
        </Button>
      </form>
      <p className="mt-2.5 text-[12.5px] text-faint">{PLAN_SUMMARIES[plan]}</p>
      {error && <p className="mt-2.5 text-[13px] text-accent-icon">{error}</p>}
    </GlassCard>
  );
}
