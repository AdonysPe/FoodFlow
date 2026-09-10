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
    include: {
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          passwordHash: true,
          requiresPasswordSetup: true,
        },
      },
    },
  });

  const members: StaffMemberDTO[] = memberships.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    email: m.user.email,
    createdAt: m.createdAt.toISOString(),
    active: Boolean(m.user.passwordHash) && !m.user.requiresPasswordSetup,
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
