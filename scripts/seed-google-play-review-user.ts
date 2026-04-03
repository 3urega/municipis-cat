import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { loadProjectEnv } from "../src/lib/loadProjectEnv";
import { getPostgresConnectionStringForAdapter } from "../src/lib/postgresConnectionForAdapter";

const BCRYPT_ROUNDS = 12;

/**
 * Crea o actualitza un usuari estable per revisió Google Play (rol `user`).
 * Només s’executa si PLAY_REVIEW_SEED_ENABLED=true (evita execucions accidentals).
 */
async function seed(): Promise<void> {
  loadProjectEnv();

  if (process.env.PLAY_REVIEW_SEED_ENABLED !== "true") {
    console.error(
      "Refusat: defineix PLAY_REVIEW_SEED_ENABLED=true per executar aquest script.",
    );
    process.exitCode = 1;
    return;
  }

  const email = process.env.PLAY_REVIEW_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.PLAY_REVIEW_USER_PASSWORD?.trim();

  if (
    email === undefined ||
    email.length === 0 ||
    password === undefined ||
    password.length < 12
  ) {
    console.error(
      "Cal PLAY_REVIEW_USER_EMAIL i PLAY_REVIEW_USER_PASSWORD (mínim 12 caràcters).",
    );
    process.exitCode = 1;
    return;
  }

  const adapter = new PrismaPg({
    connectionString: getPostgresConnectionStringForAdapter(),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: "Google Play reviewer",
        emailVerified: new Date(),
        role: "user",
        passwordHash,
      },
      update: {
        name: "Google Play reviewer",
        role: "user",
        passwordHash,
      },
    });
    console.info(`Usuari de revisió creat/actualitzat: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
