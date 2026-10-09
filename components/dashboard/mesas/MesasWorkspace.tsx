"use client";

import { useState } from "react";
import AutoRefresh from "@/components/dashboard/AutoRefresh";
import PageHeader from "@/components/dashboard/PageHeader";
import SegmentedControl from "./SegmentedControl";
import FloorPlan from "./FloorPlan";
import TablesPanel from "./TablesPanel";
import ReservationsPanel from "./ReservationsPanel";
import type { TableDTO, ReservationDTO, OrderMiniDTO } from "./types";

type Tab = "plano" | "reservas";
type PlanoView = "plano" | "lista";

const TABS: { id: Tab; label: string }[] = [
  { id: "plano", label: "Plano del salón" },
  { id: "reservas", label: "Reservas" },
];

export default function MesasWorkspace({
  tables,
  reservations,
  orders,
  today,
}: {
  tables: TableDTO[];
  reservations: ReservationDTO[];
  orders: OrderMiniDTO[];
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("plano");
  const [planoView, setPlanoView] = useState<PlanoView>("plano");
  const [planEditing, setPlanEditing] = useState(false);
  const pendingWeb = reservations.filter(
    (r) => r.source === "web" && r.status === "pendiente"
  ).length;

  return (
    <div className="lbd-pg">
      {!planEditing && <AutoRefresh intervalMs={12000} />}

      <PageHeader eyebrow="SERVICIO · MESAS" title="Mesas" description="Tu salón en vivo. Toca una mesa para ver su pedido, su QR o sentar una reserva.">
        <SegmentedControl
          idBase="mesas-tab"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({
            id: t.id,
            label: (
              <>
                {t.label}
                {t.id === "reservas" && pendingWeb > 0 && <span className="lbd-sc-badge">{pendingWeb}</span>}
              </>
            ),
          }))}
        />

        {tab === "plano" && (
          <SegmentedControl
            idBase="mesas-plano-view"
            size="sm"
            value={planoView}
            onChange={setPlanoView}
            options={[
              { id: "plano", label: "Plano" },
              { id: "lista", label: "Lista" },
            ]}
          />
        )}
      </PageHeader>

      {tab === "plano" ? (
        planoView === "plano" ? (
          <FloorPlan tables={tables} reservations={reservations} orders={orders} today={today} onEditingChange={setPlanEditing} />
        ) : (
          <TablesPanel tables={tables} />
        )
      ) : (
        <ReservationsPanel tables={tables} reservations={reservations} today={today} />
      )}
    </div>
  );
}
