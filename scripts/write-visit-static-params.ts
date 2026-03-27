/**
 * Genera `visit-static-params.json` per al `generateStaticParams` de la ruta de visita
 * en builds amb `output: 'export'`. Requereix DATABASE_URL i visites a la BD.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const visits = await prisma.visit.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const rows = visits.map((v) => ({ visitId: v.id }));
  const outPath = path.join(process.cwd(), "visit-static-params.json");
  writeFileSync(outPath, `${JSON.stringify(rows, null, 0)}\n`, "utf-8");
  console.log(`Written ${String(rows.length)} ids to visit-static-params.json`);
} finally {
  await prisma.$disconnect();
}
