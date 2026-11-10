"use client";

import { useOptimistic, useTransition } from "react";
import { updateProspectAgent } from "@/lib/actions/prospects";
import { useDashboardStore } from "@/lib/store/dashboardStore";

export type ProspectAgentView = {
  paused: boolean;
  districts: string[];
  lastRunAt: string | null;
  lastRunCreated: number | null;
  lastRunUpdated: number | null;
};

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });
}

/**
 * The social-media agent's controls, on top of Prospección: an iOS-style
 * switch to pause it and the districts it searches. Both save at once and
 * the agent reads them before its next morning run (lib/prospecting/agent.ts).
 *
 * Optimistic like the rest of the board: the switch and the chips move on the
 * tap, and snap back with a toast if the save fails.
 */
export default function ProspectAgentCard({
  agent,
  runTime,
  districtGroups,
  maxDistricts,
}: {
  agent: ProspectAgentView;
  runTime: string;
  districtGroups: { label: string; districts: string[] }[];
  maxDistricts: number;
}) {
  const pushToast = useDashboardStore((s) => s.pushToast);
  const [, startTransition] = useTransition();
  const [view, apply] = useOptimistic(agent, (state, patch: Partial<ProspectAgentView>) => ({ ...state, ...patch }));

  function save(patch: { paused?: boolean; districts?: string[] }, done: string) {
    startTransition(async () => {
      apply(patch);
      const result = await updateProspectAgent(patch);
      pushToast(result.ok ? done : result.error, result.ok ? "success" : "error");
    });
  }

  const active = !view.paused;
  const available = districtGroups
    .map((group) => ({ ...group, districts: group.districts.filter((d) => !view.districts.includes(d)) }))
    .filter((group) => group.districts.length > 0);
  const full = view.districts.length >= maxDistricts;

  const lastRun =
    view.lastRunAt == null
      ? "Aún no ha buscado."
      : `Última búsqueda: ${dayLabel(view.lastRunAt)} · ${view.lastRunCreated ?? 0} nuevos · ${view.lastRunUpdated ?? 0} completados`;

  return (
    <section className="lbd-card lbd-px-agent lbd-rise" data-paused={view.paused} aria-label="Agente de redes">
      <div className="lbd-px-agent-head">
        <div className="lbd-px-agent-text">
          <span className="lbd-mono lbd-bl-eyebrow">AGENTE DE REDES</span>
          <strong>Busca restaurantes en Instagram y Facebook</strong>
          <span className="lbd-px-agent-status" aria-live="polite">
            <i aria-hidden="true" />
            {active ? `Activo · busca cada mañana a las ${runTime} en tu PC` : "En pausa · no buscará hasta que lo actives"}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={active ? "Pausar el agente" : "Activar el agente"}
          className="lbd-px-sw"
          onClick={() => save({ paused: active }, active ? "Agente en pausa. Mañana no buscará." : "Agente activo. Busca mañana a las " + runTime + ".")}
        >
          <span className="lbd-px-sw-thumb" />
        </button>
      </div>

      <div className="lbd-px-agent-zone">
        <span className="lbd-px-agent-label">Dónde busca</span>
        <div className="lbd-px-chips">
          {view.districts.map((d) => (
            <span key={d} className="lbd-px-chip">
              {d}
              {view.districts.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar ${d}`}
                  onClick={() => save({ districts: view.districts.filter((x) => x !== d) }, `Ya no busca en ${d}.`)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {!full && available.length > 0 && (
            <label className="lbd-px-chip lbd-px-chip--add">
              <span aria-hidden="true">+ Distrito</span>
              <select
                aria-label="Agregar un distrito"
                value=""
                onChange={(event) => {
                  const d = event.target.value;
                  if (d) save({ districts: [...view.districts, d] }, `También busca en ${d}.`);
                }}
              >
                <option value="" disabled>
                  Agregar distrito
                </option>
                {available.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <p className="lbd-px-agent-foot">
        {lastRun}
        {full ? ` · Hasta ${maxDistricts} distritos a la vez.` : ""}
      </p>
    </section>
  );
}
