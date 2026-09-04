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
  // Whose account this is. For a table the comanda stores the table name, so
  // the ticket only prints it when it actually says something different.
  customerName: string;
  tableZone: string | null;
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

// What the kitchen board and the table drawer print where a waiter's name
// would go, when the round was sent by the diner from the table QR.
export const QR_ORIGIN_LABEL = "Pedido desde la mesa";

export const ZONE_LABELS_ES: Record<string, string> = {
  salon: "Salón",
  terraza: "Terraza",
  barra: "Barra",
};
