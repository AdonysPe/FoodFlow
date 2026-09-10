import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      passwordHash: null,
      requiresPasswordSetup: false,
    },
    data: { requiresPasswordSetup: true },
  });

  console.info(`[migrate-users] usuarios marcados: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("[migrate-users] fallo la migración", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
