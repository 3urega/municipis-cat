import { PrismaPg } from "@prisma/adapter-pg";
import { MediaType, PrismaClient } from "@prisma/client";

import { loadProjectEnv } from "../src/lib/loadProjectEnv";
import { getPostgresConnectionStringForAdapter } from "../src/lib/postgresConnectionForAdapter";
import { isLocalVisitUploadUrl, statVisitUploadForUser } from "../src/lib/uploads/visitUploadFs";

async function recalculate(): Promise<void> {
  loadProjectEnv();
  const adapter = new PrismaPg({
    connectionString: getPostgresConnectionStringForAdapter(),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({ select: { id: true } });

    for (const { id: userId } of users) {
      const mediaRows = await prisma.media.findMany({
        where: {
          type: MediaType.image,
          visit: { userId },
        },
        select: { id: true, url: true, sizeBytes: true },
      });

      let total = 0;
      for (const m of mediaRows) {
        if (!isLocalVisitUploadUrl(m.url)) {
          continue;
        }
        let sz = m.sizeBytes;
        if (sz === null || sz === undefined) {
          const st = await statVisitUploadForUser(m.url, userId);
          sz = st ?? 0;
          if (sz > 0) {
            await prisma.media.update({
              where: { id: m.id },
              data: { sizeBytes: sz },
            });
          }
        }
        total += sz ?? 0;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { storageUsed: BigInt(total) },
      });
      console.info(`User ${userId}: storage_used = ${String(total)} bytes`);
    }

    console.info("Recàlcul d’emmagatzematge completat.");
  } finally {
    await prisma.$disconnect();
  }
}

void recalculate().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
