import {
  BLOCKING_RESERVATION_STATUSES,
  reservationStillHolds,
  type TableStateValue,
} from "@/lib/tableMeta";
import type { ReservationDTO, OrderMiniDTO, TableDTO } from "./types";

// Derived operational state of a table:
//   ocupada   → marked occupied by hand, or it has a linked active order
//   reservada → has a confirmed/seated reservation for today that still holds
//               the table (from its start until its 3-hour block window ends);
//               a table booked for tonight already reads as reservada now
//   libre     → neither
// Occupancy wins over a reservation: if guests are seated, that is the truth
// on the floor regardless of what the book says.
export function computeTableState(
  table: TableDTO,
  linkedOrders: OrderMiniDTO[],
  reservations: ReservationDTO[],
  todayIso: string,
  nowMinutes: number
): TableStateValue {
  if (table.occupiedAt || linkedOrders.length > 0) return "ocupada";

  const reserved = reservations.some(
    (r) =>
      r.tableId === table.id &&
      r.date === todayIso &&
      BLOCKING_RESERVATION_STATUSES.includes(r.status) &&
      reservationStillHolds(r.startTime, r.durationMin, nowMinutes)
  );
  return reserved ? "reservada" : "libre";
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
