import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
