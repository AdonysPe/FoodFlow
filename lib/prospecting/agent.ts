// The social-media agent's switch and zone (table `prospect_agent`, one row).
// Adonis sets them from Prospección; the agent reads them with
// `npm run prospects:config` before every search and stops if it is paused.
//
// Server/CLI only.

import { z } from "zod";
import type { ProspectAgent } from "@prisma/client";
import { DISTRICT_GROUPS } from "./searches";

export const AGENT_ID = "redes";

/** The run the agent makes each morning on Adonis's PC (the scheduled task's time). */
export const AGENT_RUN_TIME = "9:09";

/**
 * Every district the agent can search: the ones OpenStreetMap already sweeps
 * plus the rest of Lima's, grouped for the picker. The agent only needs the
 * name — it searches social media, not map boundaries.
 */
export const AGENT_DISTRICT_GROUPS: { label: string; districts: string[] }[] = [
  ...DISTRICT_GROUPS.map((group) =>
    group.label === "Lima norte y este"
      ? { ...group, districts: [...group.districts, "El Agustino", "Santa Anita", "Rímac", "Comas", "Carabayllo", "Puente Piedra", "Lurigancho-Chosica"] }
      : group
  ),
  { label: "Lima sur", districts: ["Chorrillos", "Surquillo", "San Juan de Miraflores", "Villa El Salvador", "Villa María del Triunfo"] },
];

export const AGENT_DISTRICTS = AGENT_DISTRICT_GROUPS.flatMap((group) => group.districts);

/** How many districts it may split one morning's searches across before each gets too few. */
export const MAX_AGENT_DISTRICTS = 4;

export const agentUpdateSchema = z.object({
  paused: z.boolean().optional(),
  districts: z
    .array(z.enum(AGENT_DISTRICTS as [string, ...string[]]))
    .min(1, "Elige al menos un distrito.")
    .max(MAX_AGENT_DISTRICTS, `Hasta ${MAX_AGENT_DISTRICTS} distritos a la vez.`)
    .transform((list) => [...new Set(list)])
    .optional(),
});

export type AgentUpdate = z.infer<typeof agentUpdateSchema>;

type Db = {
  prospectAgent: {
    upsert(args: { where: { id: string }; create: { id: string }; update: Record<string, never> }): Promise<ProspectAgent>;
  };
};

/** The settings row, created with the defaults if it is somehow missing. */
export function readAgent(db: Db): Promise<ProspectAgent> {
  return db.prospectAgent.upsert({ where: { id: AGENT_ID }, create: { id: AGENT_ID }, update: {} });
}
