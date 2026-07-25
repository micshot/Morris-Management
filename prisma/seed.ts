import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seeds the pilot agency and its admin. Idempotent: safe to run repeatedly.
// The pilot operates as a single agency until auth + agency onboarding is built.
async function main() {
  const agency = await prisma.agency.upsert({
    where: { id: "pilot-agency" },
    update: {},
    create: { id: "pilot-agency", name: "Pilot Agency" },
  });

  await prisma.agent.upsert({
    where: { agencyId_email: { agencyId: agency.id, email: "admin@pilot.local" } },
    update: {},
    create: {
      agencyId: agency.id,
      name: "Pilot Admin",
      email: "admin@pilot.local",
      role: "ADMIN",
    },
  });

  console.log("Seeded agency:", agency.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
