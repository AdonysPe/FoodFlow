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

  // One venue needs no switcher: the sidebar already names it.
  if (restaurants.length <= 1) return null;

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
      className="lbd-switch"
    >
      {restaurants.map((restaurant) => (
        <option key={restaurant.id} value={restaurant.id}>
          {restaurant.name}
        </option>
      ))}
    </select>
  );
}
