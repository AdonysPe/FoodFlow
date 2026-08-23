import GlassCard from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/format";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
};

export default function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  if (customers.length === 0) {
    return (
      <GlassCard className="p-10 text-center text-[14px] text-white/40" hoverLift={false}>
        No customers yet. They&apos;ll appear here once orders are logged with a phone or email.
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-0" hoverLift={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/[0.07] text-[12px] uppercase tracking-wide text-white/35">
              <th className="px-5 py-3.5 font-medium">Name</th>
              <th className="px-5 py-3.5 font-medium">Contact</th>
              <th className="px-5 py-3.5 font-medium">Orders</th>
              <th className="px-5 py-3.5 font-medium">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-5 py-3.5 font-medium text-white/85">{c.name}</td>
                <td className="px-5 py-3.5 text-white/55">{c.email || c.phone || "—"}</td>
                <td className="px-5 py-3.5 text-white/70">{c.ordersCount}</td>
                <td className="px-5 py-3.5 font-medium text-white/85">
                  {formatCurrency(c.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
