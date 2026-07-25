import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 moves the datasource connection URL out of schema.prisma into here.
// The CLI (migrate/db push/generate) reads this; the runtime client uses the
// pg adapter in src/lib/db.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
