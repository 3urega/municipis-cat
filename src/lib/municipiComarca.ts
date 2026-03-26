export type MunicipiComarcaEntry = {
  comarcaName: string;
  comarcaCode: string;
};

export type MunicipiComarcaMap = Record<string, MunicipiComarcaEntry>;

export function isMunicipiComarcaMap(value: unknown): value is MunicipiComarcaMap {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const o = value as Record<string, unknown>;
  const firstKey = Object.keys(o)[0];
  if (firstKey === undefined) {
    return true;
  }
  const sample = o[firstKey];
  if (typeof sample !== "object" || sample === null) {
    return false;
  }
  const e = sample as Record<string, unknown>;
  return (
    typeof e.comarcaName === "string" && typeof e.comarcaCode === "string"
  );
}

/** Claus candidates (INE / idescat amb o sense zeros). */
function municipalityIdLookupKeys(id: string): string[] {
  if (!/^\d+$/.test(id)) {
    return [id];
  }
  const out = new Set<string>();
  out.add(id);
  out.add(id.padStart(6, "0"));
  const trimmed = id.replace(/^0+/, "");
  if (trimmed.length > 0) {
    out.add(trimmed);
    out.add(trimmed.padStart(6, "0"));
  }
  return [...out];
}

export function findComarcaForMunicipalityId(
  map: MunicipiComarcaMap,
  municipalityId: string,
): MunicipiComarcaEntry | null {
  for (const k of municipalityIdLookupKeys(municipalityId)) {
    const hit = map[k];
    if (hit !== undefined) {
      return hit;
    }
  }
  return null;
}

export function hueFromComarcaCode(comarcaCode: string): number {
  let h = 0;
  for (let i = 0; i < comarcaCode.length; i += 1) {
    h = (h * 33 + comarcaCode.charCodeAt(i)) % 360;
  }
  return h;
}
