import { redirect } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logout } from "@/lib/actions/auth";

export const metadata = {
  title: "Dashboard",
};

export default async function ClientDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-16">
      <GlassCard className="w-full max-w-md p-8 text-center" hoverLift={false}>
        <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/50">
          {user.email}
        </span>
        <h1 className="mt-5 font-display text-[1.4rem] font-bold tracking-[-0.02em] text-white">
          Your restaurant dashboard is coming soon
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/50">
          We&apos;re still building the client experience. The FoodFlow team will reach out once
          your restaurant is set up.
        </p>
        <form action={logout} className="mt-7">
          <button
            type="submit"
            className="text-[13.5px] font-medium text-white/40 hover:text-white/70"
          >
            Log out
          </button>
        </form>
      </GlassCard>
    </main>
  );
}
