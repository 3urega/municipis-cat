import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { getPostgresConnectionStringForPrismaApp } from "@/lib/postgresConnectionForAdapter";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaPg | undefined;
};

/** Connexió per `PrismaPg`: directa `postgresql://`; vegeu DIRECT_URL si useu Accelerate. */
function getConnectionString(): string {
  return getPostgresConnectionStringForPrismaApp();
}

export function getOrCreatePrismaClient(): PrismaClient {
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }

  const adapter =
    globalForPrisma.adapter ??
    new PrismaPg({ connectionString: getConnectionString() });
  globalForPrisma.adapter = adapter;

  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  return client;
}
