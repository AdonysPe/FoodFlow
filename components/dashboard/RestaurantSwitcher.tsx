"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectActiveRestaurant } from "@/lib/actions/restaurants";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type RestaurantOption = {
  id: string;
  name: string;
};

export default function RestaurantSwitcher({
  restaurants,
  activeRestaurantId,
}: {
  restaurants: RestaurantOption[];
  activeRestaurantId: string;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((state) => state.pushToast);
  const [isPending, startTransition] = useTransition();

  if (restaurants.length <= 1) {
    return (
      <span className="max-w-36 truncate rounded-full border border-fg/[0.1] bg-fg/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {restaurants[0]?.name ?? "Sin local"}
      </span>
    );
  }

  return (
    <select
      aria-label="Restaurante activo"
      value={activeRestaurantId}
      disabled={isPending}
      onChange={(event) => {
        const restaurantId = event.target.value;
        startTransition(async () => {
          const result = await selectActiveRestaurant(restaurantId);
          if (!result.ok) {
            pushToast(result.error, "error");
            return;
          }
          router.refresh();
        });
      }}
      className="min-w-0 max-w-40 rounded-lg border border-fg/[0.1] bg-fg/[0.04] px-2 py-1 text-[11px] font-semibold text-muted outline-none focus:border-accent-400/50 disabled:opacity-60"
    >
      {restaurants.map((restaurant) => (
        <option key={restaurant.id} value={restaurant.id}>
          {restaurant.name}
        </option>
      ))}
    </select>
  );
}
