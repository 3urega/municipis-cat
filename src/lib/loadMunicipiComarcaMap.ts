import { readFileSync } from "node:fs";
import path from "node:path";

import {
  type MunicipiComarcaMap,
  isMunicipiComarcaMap,
} from "@/lib/municipiComarca";

let cache: MunicipiComarcaMap | null = null;

export function loadMunicipiComarcaMapSync(): MunicipiComarcaMap {
  if (cache !== null) {
    return cache;
  }
  const filePath = path.join(
    process.cwd(),
    "public/data/municipi-comarca.json",
  );
  const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
  if (!isMunicipiComarcaMap(raw)) {
    cache = {};
    return cache;
  }
  cache = raw;
  return cache;
}
