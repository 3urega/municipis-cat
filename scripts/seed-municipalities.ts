import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { FeatureCollection } from "geojson";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  filterMunicipalityPolygonFeatures,
  getMunicipalityFromPolygonFeature,
} from "../src/lib/catalunyaGeoJson";
import { loadProjectEnv } from "../src/lib/loadProjectEnv";
import { getPostgresConnectionStringForAdapter } from "../src/lib/postgresConnectionForAdapter";

/** BD remota (Prisma Postgres, latència): lots petits + timeout de transacció alt. */
const UPSERT_CHUNK = 35;

const TRANSACTION_OPTS = {
  maxWait: 20_000,
  timeout: 180_000,
} as const;

async function seed(): Promise<void> {
  loadProjectEnv();
  const adapter = new PrismaPg({
    connectionString: getPostgresConnectionStringForAdapter(),
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const geoPath = path.join(
      process.cwd(),
      "public/data/catalunya-municipis.geojson",
    );
    const raw = readFileSync(geoPath, "utf-8");
    const fc = JSON.parse(raw) as FeatureCollection;
    const polys = filterMunicipalityPolygonFeatures(fc);

    const unique = new Map<string, string>();
    for (const feature of polys.features) {
      const m = getMunicipalityFromPolygonFeature(feature);
      if (m === null) {
        continue;
      }
      const displayName = m.name.length > 0 ? m.name : `Municipi ${m.id}`;
      unique.set(m.id, displayName);
    }

    const entries = [...unique.entries()];
    for (let i = 0; i < entries.length; i += UPSERT_CHUNK) {
      const slice = entries.slice(i, i + UPSERT_CHUNK);
      // Amb `PrismaPg`, el `$transaction([...], { timeout })` no està tipat; la forma interactiva sí.
      await prisma.$transaction(
        async (tx) => {
          for (const [id, name] of slice) {
            await tx.municipality.upsert({
              where: { id },
              create: { id, name },
              update: { name },
            });
          }
        },
        TRANSACTION_OPTS,
      );
    }

    console.info(`Municipis creats/actualitzats: ${String(unique.size)}`);
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
