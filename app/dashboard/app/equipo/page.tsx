import { prisma } from "@/lib/db/prisma";
import { requirePlanFeature } from "@/lib/auth/plan";
import { PLAN_MAX_USERS, staffSeatsLeft } from "@/lib/plans";
import EquipoManager from "@/components/dashboard/equipo/EquipoManager";
import PlanGate from "@/components/dashboard/PlanGate";
import type { StaffMemberDTO } from "@/lib/actions/staff";

export const metadata = {
  title: "Equipo",
};

export default async function EquipoPage() {
  const { restaurant, plan, allowed } = await requirePlanFeature("staff");
  if (!allowed) return <PlanGate feature="staff" plan={plan} />;
  if (!restaurant) return null;

  const memberships = await prisma.staffMembership.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, email: true, createdAt: true } } },
  });

  // A mozo who has actually signed in at least once has consumed an OTP.
  const emails = memberships.map((m) => m.user.email);
  const seenEmails = new Set(
    (
      await prisma.oTPCode.findMany({
        where: { email: { in: emails }, consumedAt: { not: null } },
        select: { email: true },
        distinct: ["email"],
      })
    ).map((r) => r.email)
  );

  const members: StaffMemberDTO[] = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    email: m.user.email,
    createdAt: m.createdAt.toISOString(),
    active: seenEmails.has(m.user.email),
  }));

  const seatsLeft = staffSeatsLeft(plan, members.length);

  return (
    <EquipoManager
      members={members}
      maxUsers={PLAN_MAX_USERS[plan] === Infinity ? null : PLAN_MAX_USERS[plan]}
      seatsLeft={seatsLeft === Infinity ? null : seatsLeft}
    />
  );
}
