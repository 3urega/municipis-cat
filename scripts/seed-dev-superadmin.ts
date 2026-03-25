import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { DEV_SUPERADMIN_EMAIL } from "../src/lib/devAuth";
import { loadProjectEnv } from "../src/lib/loadProjectEnv";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

const DEV_PLAIN_PASSWORD = "123qweASD";
const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  loadProjectEnv();
  const adapter = new PrismaPg({ connectionString: getConnectionString() });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(DEV_PLAIN_PASSWORD, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: DEV_SUPERADMIN_EMAIL },
      create: {
        email: DEV_SUPERADMIN_EMAIL,
        name: "Dev Superadmin",
        emailVerified: new Date(),
        role: "superadmin",
        passwordHash,
      },
      update: {
        name: "Dev Superadmin",
        role: "superadmin",
        passwordHash,
      },
    });
    console.info(`Usuari dev superadmin creat/actualitzat: ${DEV_SUPERADMIN_EMAIL}`);
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
