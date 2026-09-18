import { notFound } from "next/navigation";
import { normalizeTableCode } from "@/lib/tableCode";
import { readTableOrderState } from "@/lib/db/tableOrderState";
import TableOrderExperience from "@/components/public/TableOrderExperience";

export const metadata = {
  title: "Pedir en la mesa",
  robots: { index: false, follow: false },
};

// The open tab changes between two scans of the same QR, so this page is never
// served from a cache.
export const dynamic = "force-dynamic";

export default async function TableOrderPage({ params }) {
  const { code: raw } = await params;
  const code = normalizeTableCode(raw);
  if (code.length !== 10) notFound();

  const state = await readTableOrderState(code);
  if (!state) notFound();

  return (
    <main id="main">
      <TableOrderExperience code={code} initial={state} />
    </main>
  );
}
