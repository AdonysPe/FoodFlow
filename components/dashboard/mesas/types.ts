import type {
  TableShapeValue,
  TableZoneValue,
  ReservationStatusValue,
  ReservationSourceValue,
} from "@/lib/tableMeta";

// Plain, serializable shapes handed from the server page to the client
// workspace — Prisma rows with Dates flattened to strings.
export type TableDTO = {
  id: string;
  name: string;
  capacity: number;
  shape: TableShapeValue;
  zone: TableZoneValue;
  x: number;
  y: number;
  active: boolean;
  occupiedAt: string | null;
};

// A trimmed order row — just what the table drawer needs to show the active
// comanda for an occupied table.
export type OrderMiniDTO = {
  id: string;
  tableId: string | null;
  customerName: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  status: "pending" | "preparing" | "ready";
  createdAt: string;
};

export type ReservationDTO = {
  id: string;
  tableId: string | null;
  tableName: string | null;
  customerName: string;
  customerPhone: string | null;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  durationMin: number;
  partySize: number;
  status: ReservationStatusValue;
  source: ReservationSourceValue;
  notes: string | null;
};
