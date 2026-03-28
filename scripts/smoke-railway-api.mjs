#!/usr/bin/env node
/**
 * Comprovacions ràpides contra el backend desplegat (ex. Railway).
 * Ús: BASE_URL=https://el-teu-servei.up.railway.app npm run smoke:railway
 */
const base = process.env.BASE_URL?.trim().replace(/\/$/, "");
if (base === undefined || base.length === 0) {
  console.error(
    "Define BASE_URL, p. ex.:\n  BASE_URL=https://catalunya-map-production.up.railway.app npm run smoke:railway",
  );
  process.exit(1);
}

async function get(path) {
  const url = `${base}${path}`;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`No s’ha pogut connectar a ${url}: ${msg}`);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* no JSON */
  }
  return { url, res, text, json };
}

async function main() {
  console.log(`Smoke API → ${base}\n`);

  const session = await get("/api/auth/session");
  console.log(
    `GET /api/auth/session → ${String(session.res.status)} ${session.json !== null ? "(JSON)" : "(no JSON)"}`,
  );

  const mun = await get("/api/municipalities");
  console.log(`GET /api/municipalities → ${String(mun.res.status)}`);
  if (mun.res.status === 401) {
    console.log(
      "  Esperat sense cookie: l’API respon JSON d’error d’autenticació. Després de login al mateix domini, torna a provar amb cookies.",
    );
  } else if (mun.res.status === 200) {
    const n = Array.isArray(mun.json) ? mun.json.length : "?";
    console.log(`  200 amb llista (length≈${String(n)}).`);
  } else {
    console.log(`  Cos (tallat): ${mun.text.slice(0, 240)}`);
  }

  const providers = await get("/api/auth/providers");
  console.log(
    `GET /api/auth/providers → ${String(providers.res.status)} ${providers.json !== null ? "(JSON)" : ""}`,
  );

  console.log("\nFet.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
