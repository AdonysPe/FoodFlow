// The social-media agent's doors into the database (see
// scripts/prospecting/agente-redes.md):
//
//   npm run prospects:config
//     → JSON with whether it is paused and which districts to search, as set
//       in Prospección. Paused means: stop, search nothing.
//
//   npm run prospects:known            (or -- "Distrito" … to override)
//     → JSON with the Instagram handles and names already in the table, so the
//       agent does not pay to look them up again.
//
//   npm run prospects:import -- .prospecting/2026-11-05.json
//     → validates the agent's file and folds it into `prospects`.
//
// Uses DATABASE_URL from .env, the same database as the site.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importSocialProspects, knownProspects, socialFileSchema } from "../lib/prospecting/social";
import { readAgent } from "../lib/prospecting/agent";

const prisma = new PrismaClient();

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "config") {
    const agent = await readAgent(prisma);
    console.log(JSON.stringify({ paused: agent.paused, districts: agent.districts }));
    return;
  }

  if (command === "known") {
    const districts = args.length ? args : (await readAgent(prisma)).districts;
    console.log(JSON.stringify(await knownProspects(prisma, districts)));
    return;
  }

  if (command === "import") {
    const file = args[0];
    if (!file) throw new Error("Falta el archivo: npm run prospects:import -- ruta/al/archivo.json");
    const parsed = socialFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!parsed.success) {
      console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
      throw new Error("El archivo no tiene el formato esperado.");
    }
    const report = await importSocialProspects(prisma, parsed.data.items);
    await readAgent(prisma);
    await prisma.prospectAgent.update({
      where: { id: "redes" },
      data: { lastRunAt: new Date(), lastRunCreated: report.created.length, lastRunUpdated: report.updated.length },
    });
    console.log(
      `[prospects] nuevos: ${report.created.length} · completados: ${report.updated.length} · saltados: ${report.skipped.length}\n` +
        JSON.stringify(report, null, 2)
    );
    return;
  }

  throw new Error('Uso: prospects-social.ts config | known ["Distrito" …] | import archivo.json');
}

main()
  .catch((error) => {
    console.error(`[prospects] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
