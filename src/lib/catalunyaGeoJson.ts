import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import proj4 from "proj4";

import {
  getMunicipalityIdFromOsmProperties,
  getMunicipalityNameFromOsmProperties,
} from "./municipalityIne";

/** ETRS89 UTM 31N — límits compartits en metres (dataset històric). */
const EPSG_25831 =
  "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

export function isMunicipalityPolygonGeometry(g: Geometry): boolean {
  return g.type === "Polygon" || g.type === "MultiPolygon";
}

/** Només polígons / multipolígons (exclou punts, línies…). */
export function filterMunicipalityPolygonFeatures(
  fc: FeatureCollection,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f) => isMunicipalityPolygonGeometry(f.geometry)),
  };
}

export type MunicipalityFromFeature = {
  id: string;
  name: string;
};

export function getMunicipalityFromPolygonFeature(
  feature: Feature<Geometry, GeoJsonProperties>,
): MunicipalityFromFeature | null {
  if (!isMunicipalityPolygonGeometry(feature.geometry)) {
    return null;
  }
  const p =
    feature.properties !== null && typeof feature.properties === "object"
      ? (feature.properties as Record<string, unknown>)
      : {};
  const id = getMunicipalityIdFromOsmProperties(p);
  if (id === null) {
    return null;
  }
  const name = getMunicipalityNameFromOsmProperties(p);
  return { id, name };
}

/**
 * Coordenades ja en WGS84 (OSM): no reprojecionar.
 * Coordenades en metres UTM (Projected): reprojecionar cada anell.
 */
function positionLooksProjected(lon: number, lat: number): boolean {
  return Math.abs(lon) > 180 || Math.abs(lat) > 90;
}

function reprojectPosition(pos: Position): Position {
  const x = pos[0];
  const y = pos[1];
  const [lng, lat] = proj4(EPSG_25831, "WGS84", [x, y]);
  return [lng, lat];
}

function reprojectRing(ring: Position[]): Position[] {
  return ring.map((pos) => {
    const x = pos[0];
    const y = pos[1];
    if (!positionLooksProjected(x, y)) {
      return pos;
    }
    return reprojectPosition(pos);
  });
}

function reprojectPolygon(poly: Polygon): Polygon {
  return {
    type: "Polygon",
    coordinates: poly.coordinates.map(reprojectRing),
  };
}

function reprojectMultiPolygon(mp: MultiPolygon): MultiPolygon {
  return {
    type: "MultiPolygon",
    coordinates: mp.coordinates.map((poly) => poly.map(reprojectRing)),
  };
}

function reprojectLineString(line: LineString): LineString {
  return {
    type: "LineString",
    coordinates: reprojectRing(line.coordinates),
  };
}

function reprojectMultiLineString(mls: MultiLineString): MultiLineString {
  return {
    type: "MultiLineString",
    coordinates: mls.coordinates.map((ring) => reprojectRing(ring)),
  };
}

/**
 * Reprojecta geometries UTM a WGS84 quan cal; deixa geometries ja geogràfiques.
 */
export function normalizeCatalunyaFeatureCollectionProjection(
  fc: FeatureCollection,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => {
      const g = f.geometry;
      let geometry: Geometry;
      if (g.type === "Polygon") {
        geometry = reprojectPolygon(g);
      } else if (g.type === "MultiPolygon") {
        geometry = reprojectMultiPolygon(g);
      } else if (g.type === "LineString") {
        geometry = reprojectLineString(g);
      } else if (g.type === "MultiLineString") {
        geometry = reprojectMultiLineString(g);
      } else {
        geometry = g;
      }
      return { ...f, geometry };
    }),
  };
}

export type PolygonLayerStyle = PathOptionsLite;

type PathOptionsLite = {
  fill: boolean;
  color: string;
  weight: number;
  opacity: number;
  fillColor: string;
  fillOpacity: number;
};

export function polygonMunicipalityStyle(args: {
  munId: string;
  visitCount: number;
  selectedId: string | null;
  hoveredId: string | null;
}): PolygonLayerStyle {
  const { munId, visitCount, selectedId, hoveredId } = args;
  const visited = visitCount > 0;
  const isSelected = selectedId === munId;
  const isHovered = hoveredId === munId;

  let fillColor = visited ? "#22c55e" : "#e2e8f0";
  let fillOpacity = visited ? 0.62 : 0.28;
  let color = visited ? "#15803d" : "#64748b";
  let weight = visited ? 1.5 : 1;

  if (isSelected) {
    fillColor = "#0ea5e9";
    fillOpacity = 0.68;
    color = "#0369a1";
    weight = 3;
  } else if (isHovered) {
    fillColor = visited ? "#4ade80" : "#cbd5e1";
    fillOpacity = 0.72;
    weight = 2.5;
    color = visited ? "#166534" : "#475569";
  }

  return {
    fill: true,
    color,
    weight,
    opacity: 1,
    fillColor,
    fillOpacity,
  };
}
