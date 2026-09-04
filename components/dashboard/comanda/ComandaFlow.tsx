"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardStore } from "@/lib/store/dashboardStore";
import { EASE } from "@/lib/motion";
import { sendComanda } from "@/lib/actions/comanda";
import type { ReceiptSettingsDTO } from "@/lib/receipt";
import type { TillBillingState } from "@/lib/db/billing";
import type {
  ComandaTableDTO,
  ComandaCategoryDTO,
  ComandaItemDTO,
  FrequentItemDTO,
  OpenTabDTO,
} from "@/lib/comandaMeta";
import TargetPicker from "./TargetPicker";
import ItemPicker from "./ItemPicker";
import CartBar from "./CartBar";
import TableAccount from "./TableAccount";
import PaymentSheet from "./PaymentSheet";
import PaymentDone, { type SettledTab } from "./PaymentDone";

export type CartLine = { qty: number; note: string };
export type Cart = Record<string, CartLine>;

export type Target =
  | { kind: "table"; id: string; name: string }
  | { kind: "pickup" }
  | { kind: "delivery" };

type Step = "target" | "items" | "account" | "pay" | "done";

export default function ComandaFlow({
  tables,
  categories,
  items,
  frequent,
  openTabs,
  venueName,
  receiptSettings,
  billing,
}: {
  tables: ComandaTableDTO[];
  categories: ComandaCategoryDTO[];
  items: ComandaItemDTO[];
  frequent: FrequentItemDTO[];
  openTabs: OpenTabDTO[];
  venueName: string;
  // Everything the cobro screen needs to preview the paper and decide whether
  // a boleta is even on the table. Read once by the page, not per charge.
  receiptSettings: ReceiptSettingsDTO;
  billing: TillBillingState;
}) {
  const router = useRouter();
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [step, setStep] = useState<Step>("target");
  const [target, setTarget] = useState<Target | null>(null);
  const [cart, setCart] = useState<Cart>({});
  // Only asked when the order is being opened; a table that already has
  // an open tab keeps the name it was opened with.
  const [customerName, setCustomerName] = useState("");
  // Survives the refresh that follows a charge, which is the point of it.
  const [settled, setSettled] = useState<SettledTab | null>(null);
  const [isSending, startSending] = useTransition();

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const tabByTable = useMemo(
    () => new Map(openTabs.map((t) => [t.tableId, t])),
    [openTabs]
  );

  const activeTab =
    target?.kind === "table" ? tabByTable.get(target.id) ?? null : null;
  const nextRound = activeTab ? activeTab.roundNumber + 1 : 1;

  const { count, total } = useMemo(() => {
    let c = 0;
    let t = 0;
    for (const [id, line] of Object.entries(cart)) {
      const item = itemById.get(id);
      if (!item) continue;
      c += line.qty;
      t += line.qty * item.price;
    }
    return { count: c, total: t };
  }, [cart, itemById]);

  function chooseTable(t: ComandaTableDTO) {
    setTarget({ kind: "table", id: t.id, name: t.name });
    setCart({});
    setCustomerName("");
    setStep(tabByTable.has(t.id) ? "account" : "items");
  }

  function chooseOther(kind: "pickup" | "delivery") {
    setTarget({ kind });
    setCart({});
    setCustomerName("");
    setStep("items");
  }

  function resetToTarget() {
    setStep("target");
    setTarget(null);
    setCart({});
    setCustomerName("");
    setSettled(null);
  }

  function setQty(itemId: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = { qty, note: prev[itemId]?.note ?? "" };
      return next;
    });
  }

  function setNote(itemId: string, note: string) {
    setCart((prev) => (prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], note } } : prev));
  }

  function send() {
    if (!target || count === 0) return;
    const lines = Object.entries(cart).map(([menuItemId, line]) => ({
      menuItemId,
      quantity: line.qty,
      note: line.note.trim() || undefined,
    }));

    startSending(async () => {
      const result = await sendComanda({
        channel: target.kind === "table" ? "dine_in" : target.kind === "delivery" ? "delivery" : "pickup",
        tableId: target.kind === "table" ? target.id : "",
        customerName: activeTab ? undefined : customerName.trim() || undefined,
        lines,
      });

      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }

      const where =
        target.kind === "table"
          ? target.name
          : target.kind === "delivery"
            ? "Delivery"
            : "Para llevar";
      pushToast(
        result.data.appended
          ? `Ronda ${result.data.round} enviada a cocina · ${where}`
          : `Comanda enviada a cocina · ${where}`,
        "success"
      );
      setCart({});
      setCustomerName("");
      // A table order sticks around to be cobrada; other channels are one-shot.
      if (target.kind === "table") setStep("account");
      else resetToTarget();
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-53px)] flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {step === "target" && (
          <motion.div
            key="target"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex-1 px-4 py-5"
          >
            <TargetPicker
              tables={tables}
              openTabs={openTabs}
              onPickTable={chooseTable}
              onPickOther={chooseOther}
            />
          </motion.div>
        )}

        {step === "account" && activeTab && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex-1"
          >
            <TableAccount
              tab={activeTab}
              onBack={resetToTarget}
              onAddItems={() => {
                setCart({});
                setStep("items");
              }}
              onCharge={() => setStep("pay")}
              onVoided={() => {
                pushToast("Cuenta anulada. Mesa libre.", "success");
                resetToTarget();
                router.refresh();
              }}
            />
          </motion.div>
        )}

        {step === "pay" && activeTab && (
          <motion.div
            key="pay"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex-1"
          >
            <PaymentSheet
              tab={activeTab}
              venueName={venueName}
              autoPrint={receiptSettings.autoPrint}
              receiptSettings={receiptSettings}
              billing={billing}
              onBack={() => setStep("account")}
              onPaid={(paid) => {
                setSettled(paid);
                setStep("done");
                router.refresh();
              }}
            />
          </motion.div>
        )}

        {step === "done" && settled && (
          <motion.div
            key="done"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-1 flex-col"
          >
            <PaymentDone
              settled={settled}
              onDone={() => {
                pushToast(
                  `Cobrado · ${settled.methodLabel} · ${settled.tableName}`,
                  "success"
                );
                resetToTarget();
              }}
            />
          </motion.div>
        )}

        {step === "items" && (
          <motion.div
            key="items"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex flex-1 flex-col"
          >
            <ItemPicker
              targetLabel={
                target?.kind === "table"
                  ? target.name
                  : target?.kind === "delivery"
                    ? "Delivery"
                    : "Para llevar"
              }
              roundNumber={target?.kind === "table" ? nextRound : 1}
              categories={categories}
              items={items}
              frequent={frequent}
              cart={cart}
              onBack={() => {
                if (target?.kind === "table" && activeTab) setStep("account");
                else resetToTarget();
              }}
              onSetQty={setQty}
              onSetNote={setNote}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {step === "items" && (
        <CartBar
          count={count}
          total={total}
          sending={isSending}
          onSend={send}
          // A round added to an open tab inherits the name already on it.
          askName={!activeTab}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
        />
      )}
    </div>
  );
}
