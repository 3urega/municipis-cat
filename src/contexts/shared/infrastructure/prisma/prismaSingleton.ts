import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adapter: PrismaPg | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
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
