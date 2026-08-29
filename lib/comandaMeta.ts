// Shared shapes for the mobile comanda. No "use server" — imported by both the
// server page/actions and the client flow components.

export type ComandaTableDTO = {
  id: string;
  name: string;
  capacity: number;
  zone: string;
  state: "libre" | "ocupada" | "reservada";
  // When the table already has an open order, the round the NEXT send will be.
  openOrderId: string | null;
  nextRound: number | null;
};

export type ComandaCategoryDTO = {
  id: string;
  name: string;
};

export type ComandaItemDTO = {
  id: string;
  name: string;
  price: number;
  categoryId: string | null;
  prepMin: number | null;
};

export type OpenTabLine = {
  name: string;
  price: number;
  quantity: number;
  note?: string;
  round?: number;
};

// A table's running account — every round sent so far, still unpaid.
export type OpenTabDTO = {
  orderId: string;
  tableId: string;
  tableName: string;
  lines: OpenTabLine[];
  total: number;
  roundNumber: number;
  kitchenStatus: "pending" | "preparing" | "ready" | "delivered";
  serverName: string | null;
  openedAt: string;
};

export type FrequentItemDTO = {
  id: string;
  name: string;
  price: number;
};

export type ComandaLineInput = {
  menuItemId: string;
  quantity: number;
  note?: string;
};

// Quick note chips offered under each line.
export const NOTE_CHIPS = ["sin cebolla", "sin sal", "sin ají", "aparte", "salsa aparte", "para llevar"];

export const ZONE_LABELS_ES: Record<string, string> = {
  salon: "Salón",
  terraza: "Terraza",
  barra: "Barra",
};
