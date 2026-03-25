import { defineConfig } from "prisma/config";

import { loadProjectEnv } from "./src/lib/loadProjectEnv";

loadProjectEnv();

/** Same default as .env.example so `prisma generate` works without a local `.env`. */
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://catalunya:catalunya@127.0.0.1:15432/catalunya_map?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx scripts/seed-municipalities.ts && tsx scripts/seed-dev-superadmin.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
