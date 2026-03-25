/**
 * Identificadors als polígons OSM (catalunya-municipis.geojson).
 * Preferim ref:idescat (p. ex. 6 dígits); fallback ine:municipio.
 */
export function getMunicipalityIdFromOsmProperties(
  properties: Record<string, unknown>,
): string | null {
  const idescat = properties["ref:idescat"];
  if (typeof idescat === "string" && /^\d{5,6}$/.test(idescat)) {
    return idescat;
  }
  const ine = properties["ine:municipio"];
  if (typeof ine === "string" && /^\d+$/.test(ine)) {
    return ine;
  }
  const refIne = properties["ref:ine"];
  if (typeof refIne === "string") {
    const digits = refIne.replace(/\D/g, "");
    if (digits.length >= 5) {
      return digits.slice(0, 5);
    }
  }
  return null;
}

export function getMunicipalityNameFromOsmProperties(
  properties: Record<string, unknown>,
): string {
  const name = properties.name;
  if (typeof name === "string" && name.length > 0) {
    return name;
  }
  const nameCa = properties["name:ca"];
  if (typeof nameCa === "string" && nameCa.length > 0) {
    return nameCa;
  }
  return "";
}
