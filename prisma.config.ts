import "dotenv/config";

import { defineConfig } from "prisma/config";

/** Same default as .env.example so `prisma generate` works without a local `.env`. */
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://catalunya:catalunya@127.0.0.1:15432/catalunya_map?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
