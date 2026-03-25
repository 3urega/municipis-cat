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

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

async function seed(): Promise<void> {
  loadProjectEnv();
  const adapter = new PrismaPg({ connectionString: getConnectionString() });
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

    await prisma.$transaction(
      [...unique.entries()].map(([id, name]) =>
        prisma.municipality.upsert({
          where: { id },
          create: { id, name },
          update: { name },
        }),
      ),
    );

    console.info(`Municipis creats/actualitzats: ${String(unique.size)}`);
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
