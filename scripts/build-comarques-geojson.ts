/**
 * Genera `public/data/catalunya-comarques.geojson` fusionant polígons
 * municipals per comarca (dades municipi-comarca.json + GeoJSON municipis).
 *
 * npm run data:comarques-geojson
 */
import { featureCollection, union } from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  filterMunicipalityPolygonFeatures,
  getMunicipalityFromPolygonFeature,
  normalizeCatalunyaFeatureCollectionProjection,
} from "../src/lib/catalunyaGeoJson";
import {
  type MunicipiComarcaMap,
  findComarcaForMunicipalityId,
  isMunicipiComarcaMap,
} from "../src/lib/municipiComarca";

function isPolygonal(
  g: Geometry,
): g is Polygon | MultiPolygon {
  return g.type === "Polygon" || g.type === "MultiPolygon";
}

function main(): void {
  const geoPath = path.join(
    process.cwd(),
    "public/data/catalunya-municipis.geojson",
  );
  const comarcaPath = path.join(
    process.cwd(),
    "public/data/municipi-comarca.json",
  );

  const rawFc = JSON.parse(readFileSync(geoPath, "utf-8")) as FeatureCollection;
  const polys = filterMunicipalityPolygonFeatures(rawFc);
  const normalized = normalizeCatalunyaFeatureCollectionProjection(polys);

  const comarcaRaw: unknown = JSON.parse(readFileSync(comarcaPath, "utf-8"));
  if (!isMunicipiComarcaMap(comarcaRaw)) {
    throw new Error("municipi-comarca.json invàlid");
  }
  const comarcaMap: MunicipiComarcaMap = comarcaRaw;

  const groups = new Map<
    string,
    { name: string; features: Feature<Polygon | MultiPolygon>[] }
  >();

  for (const feature of normalized.features) {
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null || !isPolygonal(feature.geometry)) {
      continue;
    }
    const c = findComarcaForMunicipalityId(comarcaMap, m.id);
    if (c === null || c.comarcaCode.length === 0) {
      continue;
    }
    const code = c.comarcaCode;
    const existing = groups.get(code);
    const polyFeat = feature as Feature<Polygon | MultiPolygon>;
    if (existing === undefined) {
      groups.set(code, { name: c.comarcaName, features: [polyFeat] });
    } else {
      existing.name = c.comarcaName;
      existing.features.push(polyFeat);
    }
  }

  const outFeatures: Feature<Polygon | MultiPolygon>[] = [];

  for (const [comarcaCode, { name: comarcaName, features }] of groups) {
    if (features.length === 0) {
      continue;
    }
    const fc = featureCollection(features);
    const merged = union(fc, {
      properties: {
        comarcaCode,
        comarcaName,
      },
    });
    if (merged !== null) {
      outFeatures.push(merged);
    } else {
      console.warn(`union null per comarca ${comarcaCode} (${comarcaName})`);
    }
  }

  outFeatures.sort((a, b) => {
    const na =
      typeof a.properties?.comarcaName === "string" ? a.properties.comarcaName : "";
    const nb =
      typeof b.properties?.comarcaName === "string" ? b.properties.comarcaName : "";
    return na.localeCompare(nb, "ca");
  });

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: outFeatures,
  };

  const outPath = path.join(
    process.cwd(),
    "public/data/catalunya-comarques.geojson",
  );
  writeFileSync(outPath, `${JSON.stringify(collection)}\n`, "utf-8");
  console.info(
    `catalunya-comarques.geojson: ${String(outFeatures.length)} comarques`,
  );
}

main();
