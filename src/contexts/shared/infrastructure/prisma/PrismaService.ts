import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Service } from "diod";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function getOrCreateClient(): PrismaClient {
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }

  const pool =
    globalForPrisma.pool ??
    new pg.Pool({ connectionString: getConnectionString() });
  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  return client;
}

@Service()
export class PrismaService {
  readonly client: PrismaClient;

  constructor() {
    this.client = getOrCreateClient();
  }
}
