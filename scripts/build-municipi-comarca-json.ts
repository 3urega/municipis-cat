/**
 * Genera `public/data/municipi-comarca.json` a partir de
 * https://github.com/jorvixsky/geocatalunya (domini públic).
 *
 * npm run data:comarques
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/jorvixsky/geocatalunya/main/comarques_municipis.json";

type SourceRow = { city_name: string; city_code: number };

async function main(): Promise<void> {
  const r = await fetch(SOURCE_URL);
  if (!r.ok) {
    throw new Error(`HTTP ${String(r.status)} descarregant comarques`);
  }
  const raw = (await r.json()) as Record<string, SourceRow[]>;
  const out: Record<string, { comarcaName: string; comarcaCode: string }> = {};

  const comarcaKeyRe = /^(.+?)\s*\((\d+)\)\s*$/;

  for (const [key, municipis] of Object.entries(raw)) {
    const m = comarcaKeyRe.exec(key);
    const comarcaName = m !== null ? m[1]!.trim() : key.trim();
    const comarcaCode = m !== null ? m[2]! : "";
    const info = { comarcaName, comarcaCode };

    for (const mun of municipis) {
      const id6 = String(mun.city_code).padStart(6, "0");
      out[id6] = info;
      const id5 = id6.slice(0, 5);
      const existing5 = out[id5];
      if (existing5 === undefined) {
        out[id5] = info;
      } else if (
        existing5.comarcaCode === info.comarcaCode &&
        existing5.comarcaName === info.comarcaName
      ) {
        /* mateixa comarca */
      }
      /* Col·lisions id5 (p. ex. codis 99999x): no sobreescriure */
    }
  }

  const outPath = path.join(
    process.cwd(),
    "public/data/municipi-comarca.json",
  );
  writeFileSync(outPath, `${JSON.stringify(out)}\n`, "utf-8");
  console.info(
    `municipi-comarca.json: ${String(Object.keys(out).length)} claus`,
  );
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
