"use client";

import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import L from "leaflet";
import type { Layer, PathOptions } from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";

import {
  filterMunicipalityPolygonFeatures,
  getMunicipalityFromPolygonFeature,
  normalizeCatalunyaFeatureCollectionProjection,
  polygonMunicipalityStyle,
} from "@/lib/catalunyaGeoJson";
import { useMapBasemap } from "@/store/useMapBasemap";
import { useMunicipalities } from "@/store/useMunicipalities";

function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const o = value as Record<string, unknown>;
  return o.type === "FeatureCollection" && Array.isArray(o.features);
}

function parseVisitCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.length > 0) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function municipalityIdFromApiItem(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Coincideix claus INE si API i GeoJSON difereixen en zeros a l’esquerra. */
function visitCountForMunicipalityId(
  counts: Record<string, number>,
  geoId: string,
): number {
  const direct = counts[geoId];
  if (direct !== undefined) {
    return direct;
  }
  const padded = geoId.padStart(6, "0");
  if (padded !== geoId && counts[padded] !== undefined) {
    return counts[padded];
  }
  const trimmed = geoId.replace(/^0+/, "");
  if (
    trimmed.length > 0 &&
    trimmed !== geoId &&
    counts[trimmed] !== undefined
  ) {
    return counts[trimmed];
  }
  return 0;
}

/** Mateix criteri que visit counts: zeros a l’esquerra / variants INE. */
function municipalityIdsMatch(geoId: string, selectedId: string): boolean {
  if (geoId === selectedId) {
    return true;
  }
  const paddedGeo = geoId.padStart(6, "0");
  const paddedSel = selectedId.padStart(6, "0");
  if (paddedGeo === paddedSel) {
    return true;
  }
  const trimGeo = geoId.replace(/^0+/, "") || "0";
  const trimSel = selectedId.replace(/^0+/, "") || "0";
  return trimGeo === trimSel;
}

function boundsForSelectedMunicipality(
  featureCollection: FeatureCollection,
  selectedId: string,
): L.LatLngBounds | null {
  for (const feature of featureCollection.features) {
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      continue;
    }
    if (!municipalityIdsMatch(m.id, selectedId)) {
      continue;
    }
    const b = L.geoJSON(feature).getBounds();
    return b.isValid() ? b : null;
  }
  return null;
}

const OVERVIEW_FIT_OPTS = { padding: [32, 32] as L.PointTuple, maxZoom: 10 };
/** w-80 (20rem) + marge perquè el polígon no quedi sota el panel lateral. */
const SELECTED_PADDING_BOTTOM_RIGHT: L.PointTuple = [352, 40];

function MapViewToSelection({
  data,
  overviewBounds,
  selectedId,
}: {
  data: FeatureCollection;
  overviewBounds: L.LatLngBounds;
  selectedId: string | null;
}): null {
  const map = useMap();

  useEffect(() => {
    if (selectedId !== null && selectedId.length > 0) {
      const featureBounds = boundsForSelectedMunicipality(data, selectedId);
      if (featureBounds !== null) {
        map.fitBounds(featureBounds, {
          paddingTopLeft: [32, 32],
          paddingBottomRight: SELECTED_PADDING_BOTTOM_RIGHT,
          maxZoom: 17,
        });
        return;
      }
    }
    if (overviewBounds.isValid()) {
      map.fitBounds(overviewBounds, OVERVIEW_FIT_OPTS);
    }
  }, [data, map, overviewBounds, selectedId]);

  return null;
}

export default function Map(): React.ReactElement {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [geoKeyTick, setGeoKeyTick] = useState(0);

  const municipalitiesNonce = useMunicipalities((s) => s.municipalitiesNonce);
  const selected = useMunicipalities((s) => s.selected);
  const setSelectedMunicipality = useMunicipalities(
    (s) => s.setSelectedMunicipality,
  );
  const showOsmTiles = useMapBasemap((s) => s.showOsmTiles);
  const toggleOsmTiles = useMapBasemap((s) => s.toggleOsmTiles);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/data/catalunya-municipis.geojson");
        if (!res.ok) {
          throw new Error(`HTTP ${String(res.status)}`);
        }
        const json: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (!isFeatureCollection(json)) {
          throw new Error("El fitxer no és un FeatureCollection vàlid");
        }
        const polys = filterMunicipalityPolygonFeatures(json);
        setData(normalizeCatalunyaFeatureCollectionProjection(polys));
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Error desconegut carregant el mapa",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      try {
        const res = await fetch("/api/municipalities");
        if (!res.ok) {
          throw new Error(`API municipis HTTP ${String(res.status)}`);
        }
        const list: unknown = await res.json();
        if (cancelled) {
          return;
        }
        if (!Array.isArray(list)) {
          throw new Error("Resposta municipis invàlida");
        }
        const counts: Record<string, number> = {};
        for (const item of list) {
          const id = municipalityIdFromApiItem(item);
          if (id === null) {
            continue;
          }
          counts[id] = parseVisitCount(
            (item as { visitCount?: unknown }).visitCount,
          );
        }
        setVisitCounts(counts);
        setGeoKeyTick((t) => t + 1);
      } catch {
        if (!cancelled) {
          setVisitCounts({});
          setGeoKeyTick((t) => t + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [municipalitiesNonce]);

  const bounds = useMemo((): L.LatLngBounds | null => {
    if (data === null) {
      return null;
    }
    return L.geoJSON(data).getBounds();
  }, [data]);

  const visitSignature = useMemo(
    () =>
      Object.entries(visitCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${String(v)}`)
        .join("|"),
    [visitCounts],
  );

  const geoJsonKey = `${String(geoKeyTick)}|${visitSignature}|${selected?.id ?? ""}`;

  const geoJsonStyle = (
    feature?: Feature<Geometry, GeoJsonProperties>,
  ): PathOptions => {
    if (feature === undefined) {
      return {
        fill: true,
        color: "#64748b",
        weight: 1,
        opacity: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.28,
      };
    }
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      return {
        fill: true,
        color: "#64748b",
        weight: 1,
        opacity: 1,
        fillColor: "#e2e8f0",
        fillOpacity: 0.28,
      };
    }
    const visitCount = visitCountForMunicipalityId(visitCounts, m.id);
    return polygonMunicipalityStyle({
      munId: m.id,
      visitCount,
      selectedId: selected?.id ?? null,
      hoveredId: null,
    });
  };

  const onEachFeature = (
    feature: Feature<Geometry, GeoJsonProperties>,
    layer: Layer,
  ): void => {
    const m = getMunicipalityFromPolygonFeature(feature);
    if (m === null) {
      return;
    }
    if (!(layer instanceof L.Path)) {
      return;
    }
    const pathLayer = layer;

    const applyCurrentStyle = (hoveredId: string | null): void => {
      const visitCount = visitCountForMunicipalityId(visitCounts, m.id);
      const sel = useMunicipalities.getState().selected;
      pathLayer.setStyle(
        polygonMunicipalityStyle({
          munId: m.id,
          visitCount,
          selectedId: sel?.id ?? null,
          hoveredId,
        }),
      );
    };

    pathLayer.on({
      click: () => {
        setSelectedMunicipality({ id: m.id, name: m.name });
      },
      mouseover: () => {
        applyCurrentStyle(m.id);
      },
      mouseout: () => {
        applyCurrentStyle(null);
      },
    });
  };

  if (loadError !== null) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-zinc-100 p-4 text-red-700">
        {loadError}
      </div>
    );
  }

  if (data === null || bounds === null) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center bg-zinc-100 text-zinc-600">
        Carregant municipis…
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-3rem)] min-h-[calc(100dvh-3rem)] w-full">
      <MapContainer
        center={[41.5912, 1.5209]}
        zoom={8}
        className={
          showOsmTiles
            ? "h-full min-h-0 w-full"
            : "h-full min-h-0 w-full bg-zinc-100 dark:bg-zinc-950"
        }
        scrollWheelZoom
      >
        {showOsmTiles ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : null}
        <MapViewToSelection
          data={data}
          overviewBounds={bounds}
          selectedId={selected?.id ?? null}
        />
        <GeoJSON
          key={geoJsonKey}
          data={data}
          style={geoJsonStyle}
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      <button
        type="button"
        onClick={() => {
          toggleOsmTiles();
        }}
        className="absolute bottom-4 left-4 z-[500] rounded-md border border-zinc-300 bg-white/95 px-3 py-2 text-xs font-medium text-zinc-800 shadow-md backdrop-blur hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-pressed={showOsmTiles}
      >
        {showOsmTiles ? "Només municipis" : "Mapa OSM"}
      </button>
    </div>
  );
}
