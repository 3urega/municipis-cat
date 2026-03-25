import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaPg | undefined;
};

/** Mateix default que [prisma.config.ts](prisma.config.ts) per builds sense `.env`. */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url !== undefined && url.length > 0) {
    return url;
  }
  return "postgresql://catalunya:catalunya@127.0.0.1:15432/catalunya_map?schema=public";
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
