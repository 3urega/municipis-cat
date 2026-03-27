import type { ReactNode } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { isMunicipiComarcaMap } from "@/lib/municipiComarca";

export async function generateStaticParams(): Promise<
  { municipalityId: string }[]
> {
  const fp = path.join(
    process.cwd(),
    "public/data/municipi-comarca.json",
  );
  const raw = await readFile(fp, "utf-8");
  const data: unknown = JSON.parse(raw);
  if (!isMunicipiComarcaMap(data)) {
    return [];
  }
  return Object.keys(data).map((municipalityId) => ({ municipalityId }));
}

export default function MunicipalityDynamicLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
